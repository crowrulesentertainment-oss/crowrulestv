import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

export class ChannelWorker {
  constructor({ config, env, supabase, ownerId, pollMs, heartbeatMs }) {
    this.config = config; this.env = env; this.supabase = supabase; this.ownerId = ownerId;
    this.pollMs = pollMs; this.heartbeatMs = heartbeatMs;
    this.child = null; this.currentItemId = null; this.currentItem = null;
    this.running = false; this.enabled = true; this.manualStop = false;
    this.state = "starting"; this.lastError = null; this.lastHeartbeat = null;
    this.lastSchedulePoll = 0; this.lastHeartbeatWrite = 0; this.loopPromise = null;
    this.generation = 0; this.playlistItemId = null; this.playlistEntries = []; this.playlistIndex = 0;
    this.directorOverride = null; this.directorStopped = false; this.standbyUrl = "";
    this.restartCount = 0; this.nextProgram = null; this.lastCommandPoll = 0;
  }
  get streamKey() { return this.env[this.config.keyEnv] || ""; }
  get standbyFile() { return this.env[this.config.standbyEnv] || ""; }
  get outputUrl() {
    const base = (this.env.RTMP_BASE_URL || "rtmp://a.rtmp.youtube.com/live2").replace(/\/$/, "");
    return this.streamKey ? `${base}/${this.streamKey}` : "";
  }
  snapshot() {
    return {
      id: this.config.id, slug: this.config.slug, name: this.config.name,
      state: this.state, running: this.running, enabled: this.enabled,
      hasStreamKey: Boolean(this.streamKey), hasStandby: Boolean(this.standbyFile),
      currentProgram: this.currentItem?.title || (this.state === "standby" ? "Standby slate" : null),
      currentScheduleItemId: this.currentItemId, lastError: this.lastError,
      lastHeartbeat: this.lastHeartbeat, output: this.streamKey ? "configured" : "missing_stream_key"
    };
  }
  async start() {
    if (this.running) return;
    this.manualStop = false; this.running = true; this.state = this.streamKey ? "starting" : "waiting_for_stream_key";
    const gen = ++this.generation;
    this.loopPromise = this.runLoop(gen);
  }
  async stop(reason = "stopped") {
    this.manualStop = true; this.running = false; this.generation++;
    await this.stopChild();
    this.state = reason;
    await this.writeHeartbeat().catch(() => {});
    if (this.loopPromise) await Promise.race([this.loopPromise, sleep(1500)]);
  }
  async stopChild() {
    const child = this.child;
    this.child = null;
    if (!child || child.exitCode !== null) return;
    child.kill("SIGTERM");
    await Promise.race([new Promise(resolve => child.once("exit", resolve)), sleep(4000)]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
  async getChannelConfig() {
    const rows = await this.supabase(
      `cr_channels?select=id,enabled,standby_media_url&id=eq.${encodeURIComponent(this.config.id)}`
    );
    return rows?.[0] || null;
  }
  async getCurrentScheduleItem() {
    const now = new Date().toISOString();
    const params = new URLSearchParams({
      select: "id,title,media_url,media_type,starts_at,ends_at,item_type",
      channel_id: `eq.${this.config.id}`,
      starts_at: `lte.${now}`,
      ends_at: `gt.${now}`,
      order: "starts_at.desc",
      limit: "1"
    });
    const rows = await this.supabase(`cr_schedule_items?${params.toString()}`);
    return rows?.[0] || null;
  }
  async getNextScheduleItem() {
    const now = new Date().toISOString();
    const params = new URLSearchParams({select:"id,title,starts_at",channel_id:`eq.${this.config.id}`,starts_at:`gt.${now}`,order:"starts_at.asc",limit:"1"});
    const rows = await this.supabase(`cr_schedule_items?${params.toString()}`);
    return rows?.[0] || null;
  }
  async processCommands() {
    const params = new URLSearchParams({select:"id,command,payload",channel_id:`eq.${this.config.id}`,status:"eq.pending",order:"created_at.asc",limit:"10"});
    const commands = await this.supabase(`cr_playout_commands?${params.toString()}`);
    for (const command of commands || []) {
      const claim = await this.supabase(`cr_playout_commands?id=eq.${command.id}&status=eq.pending`, {
        method:"PATCH", headers:{Prefer:"return=representation"}, body:JSON.stringify({status:"processing"})
      });
      if (!claim?.length) continue;
      try {
        const payload = command.payload || {};
        if (command.command === "stop") {
          this.directorStopped = true; await this.stopChild(); this.state = "director_stopped";
        } else if (command.command === "start") {
          this.directorStopped = false; this.currentItemId = null; this.state = "starting";
        } else if (command.command === "restart") {
          this.directorStopped = false; await this.stopChild(); this.currentItemId = null; this.state = "director_restarting";
        } else if (command.command === "director_override") {
          if (!payload.media_url) throw new Error("Director override requires a media_url");
          this.directorOverride = {id:"__director_override__",title:String(payload.title || "Director override"),media_url:String(payload.media_url),media_type:"video"};
          await this.stopChild(); this.currentItemId = null;
        } else if (command.command === "clear_override") {
          this.directorOverride = null; await this.stopChild(); this.currentItemId = null;
        } else if (command.command === "set_standby") {
          this.standbyUrl = String(payload.media_url || "");
          await this.supabase(`cr_channels?id=eq.${this.config.id}`, {method:"PATCH",body:JSON.stringify({standby_media_url:this.standbyUrl || null})});
          await this.stopChild(); this.currentItemId = null;
        }
        await this.supabase(`cr_playout_commands?id=eq.${command.id}`,{method:"PATCH",body:JSON.stringify({status:"completed",processed_at:new Date().toISOString(),error:null})});
      } catch (error) {
        await this.supabase(`cr_playout_commands?id=eq.${command.id}`,{method:"PATCH",body:JSON.stringify({status:"failed",processed_at:new Date().toISOString(),error:error.message})});
        this.lastError = error.message;
      }
    }
  }
  async writeHeartbeat() {
    if (!this.ownerId) return;
    const row = {
      owner_id: this.ownerId, channel_id: this.config.id,
      destination_type: "youtube_live", destination_label: `YouTube — ${this.config.name}`,
      worker_id: `crowrules-plus-${this.config.slug}`,
      enabled: this.enabled, status: this.state,
      last_heartbeat_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await this.supabase("cr_broadcast_outputs?on_conflict=channel_id", {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(row)
    });
    this.lastHeartbeat = row.last_heartbeat_at;
  }
  async runLoop(gen) {
    while (this.running && gen === this.generation) {
      try {
        if (Date.now() - this.lastCommandPoll >= this.pollMs) {
          this.lastCommandPoll = Date.now();
          await this.processCommands();
        }
        if (!this.streamKey) {
          this.state = "waiting_for_stream_key";
          if (Date.now() - this.lastHeartbeatWrite >= this.heartbeatMs) { this.lastHeartbeatWrite = Date.now(); await this.writeHeartbeat(); }
          await sleep(this.pollMs);
          continue;
        }
        const dbChannel = await this.getChannelConfig();
        this.enabled = dbChannel?.enabled ?? true;
        this.standbyUrl = dbChannel?.standby_media_url || this.standbyUrl || "";
        this.nextProgram = await this.getNextScheduleItem();
        if (this.directorStopped) {
          await this.stopChild(); this.state = "director_stopped";
        } else if (!this.enabled) {
          await this.stopChild(); this.currentItem = null; this.currentItemId = null; this.state = "disabled";
        } else {
          const scheduledItem = await this.getCurrentScheduleItem();
          const item = this.directorOverride || scheduledItem;
          const id = item?.id || ((this.standbyUrl || this.standbyFile) ? "__standby__" : null);
          if (id !== this.currentItemId) {
            await this.stopChild();
            this.currentItem = item || null; this.currentItemId = id;
            this.playlistItemId = null; this.playlistEntries = []; this.playlistIndex = 0;
            if (item) await this.launch(item, gen);
            else if (this.standbyUrl || this.standbyFile) await this.launchStandby(gen);
            else this.state = "idle_no_program";
          } else if (id && !this.child) {
            if (item) await this.launch(item, gen);
            else if (this.standbyUrl || this.standbyFile) await this.launchStandby(gen);
          } else if (!id) this.state = "idle_no_program";
        }
        if (Date.now() - this.lastHeartbeatWrite >= this.heartbeatMs) {
          this.lastHeartbeatWrite = Date.now(); await this.writeHeartbeat();
        }
        await sleep(this.pollMs);
      } catch (error) {
        this.lastError = error.message; this.state = "error";
        console.error(`[${this.config.slug}]`, error.message);
        await sleep(this.pollMs);
      }
    }
  }
  async resolveInput(item) {
    const raw = item.media_url || "";
    if (!raw) throw new Error("Schedule item has no media_url");
    if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(raw)) {
      const args = ["--no-warnings", "--no-playlist", "-f", "best[ext=mp4]/best", "-g", raw];
      const result = await this.runCapture(this.env.YTDLP_PATH || "yt-dlp", args, 30000);
      const url = result.trim().split(/\r?\n/)[0];
      if (!url) throw new Error("yt-dlp returned no playable media URL");
      return url;
    }
    return raw;
  }
  runCapture(command, args, timeoutMs) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "", stderr = "";
      const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error(`${command} timed out`)); }, timeoutMs);
      child.stdout.on("data", d => stdout += d.toString());
      child.stderr.on("data", d => stderr += d.toString());
      child.on("error", error => { clearTimeout(timer); reject(error); });
      child.on("close", code => {
        clearTimeout(timer);
        if (code === 0) resolve(stdout);
        else reject(new Error(`${command} exited ${code}: ${stderr.slice(-300)}`));
      });
    });
  }
  ffmpegArgs(input, loop = false) {
    const args = ["-hide_banner", "-loglevel", "warning", "-re"];
    if (loop) args.push("-stream_loop", "-1");
    args.push("-i", input,
      "-map", "0:v:0?", "-map", "0:a:0?",
      "-c:v", "libx264", "-preset", this.env.FFMPEG_PRESET || "veryfast",
      "-tune", "zerolatency", "-pix_fmt", "yuv420p",
      "-r", String(this.env.VIDEO_FPS || "30"), "-g", String(Number(this.env.VIDEO_FPS || 30) * 2),
      "-b:v", this.env.VIDEO_BITRATE || "4500k", "-maxrate", this.env.VIDEO_BITRATE || "4500k",
      "-bufsize", "9000k", "-c:a", "aac", "-b:a", this.env.AUDIO_BITRATE || "128k",
      "-ar", "44100", "-ac", "2", "-f", "flv", this.outputUrl);
    return args;
  }
  async launch(item, gen) {
    try {
      this.state = "resolving_media";
      let input, title = item.title;
      const isPlaylist = item.media_type === "youtube_playlist" || /[?&]list=/.test(item.media_url || "");
      if (isPlaylist) {
        if (this.playlistItemId !== item.id) {
          const raw = await this.runCapture(this.env.YTDLP_PATH || "yt-dlp", ["--no-warnings", "--flat-playlist", "--dump-single-json", item.media_url], 45000);
          const data = JSON.parse(raw);
          this.playlistEntries = (data.entries || []).filter(Boolean).map(entry => entry.webpage_url || entry.original_url || (entry.url && /^https?:\/\//i.test(entry.url) ? entry.url : null) || (entry.id ? "https://www.youtube.com/watch?v=" + entry.id : null)).filter(Boolean);
          if (!this.playlistEntries.length) throw new Error("YouTube playlist contains no playable entries");
          this.playlistItemId = item.id; this.playlistIndex = 0;
        }
        const entryUrl = this.playlistEntries[this.playlistIndex % this.playlistEntries.length];
        this.playlistIndex = (this.playlistIndex + 1) % this.playlistEntries.length;
        input = await this.resolveInput({ media_url: entryUrl });
        title = item.title + " · playlist item " + this.playlistIndex + "/" + this.playlistEntries.length;
      } else input = await this.resolveInput(item);
      if (!this.running || gen !== this.generation) return;
      this.state = "encoder_starting_unverified";
      this.spawnFfmpeg(this.ffmpegArgs(input), gen, title);
    } catch (error) {
      this.lastError = error.message; this.state = "media_error";
    }
  }
  async launchStandby(gen) {
    const input = this.standbyUrl || this.standbyFile;
    if (!input) return;
    this.state = "standby";
    try {
      const resolved = this.standbyUrl ? await this.resolveInput({media_url:this.standbyUrl}) : input;
      if (this.running && gen === this.generation) this.spawnFfmpeg(this.ffmpegArgs(resolved, true), gen, "Standby slate");
    } catch (error) { this.lastError = error.message; this.state = "standby_error"; }
  }
  spawnFfmpeg(args, gen, title) {
    const child = spawn(this.env.FFMPEG_PATH || "ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    this.child = child;
    child.once("spawn", () => { if (this.child === child && this.running && gen === this.generation) this.state = "encoder_running_unverified"; });
    child.stderr.on("data", data => {
      const line = data.toString().trim();
      if (line && /error|failed|invalid/i.test(line)) this.lastError = line.slice(-350);
    });
    child.on("error", error => {
      if (this.child === child) { this.child = null; this.state = "encoder_error"; this.lastError = error.message; }
    });
    child.on("close", code => {
      if (this.child === child) this.child = null;
      if (this.running && gen === this.generation && this.currentItemId) {
        this.state = code === 0 ? "program_ended_waiting" : "encoder_restarting";
        if (code !== 0) this.lastError = `FFmpeg exited with code ${code} while playing ${title}`;
      }
    });
    console.log(`[${this.config.slug}] FFmpeg started: ${title}`);
  }
}