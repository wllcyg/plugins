/**
 * Web Audio API 音量增益放大器 (突破 100% ~ 600%)
 */
class AudioBoosterManager {
  private boostMap = new WeakMap<HTMLVideoElement, { ctx: AudioContext; gain: GainNode }>();

  public setBoost(video: HTMLVideoElement, ratio: number) {
    if (ratio < 1.0) ratio = 1.0;
    if (ratio > 6.0) ratio = 6.0;

    try {
      let node = this.boostMap.get(video);
      if (!node) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass();
        const source = ctx.createMediaElementSource(video);
        const gain = ctx.createGain();

        source.connect(gain);
        gain.connect(ctx.destination);

        node = { ctx, gain };
        this.boostMap.set(video, node);

        // 处理浏览器自动播放策略（Autoplay restriction）
        const resumeAudio = () => {
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
        };
        video.addEventListener('play', resumeAudio, { once: true });
        video.addEventListener('playing', resumeAudio, { once: true });
      }

      // 平滑设置音量增益
      node.gain.gain.value = ratio;
      if (node.ctx.state === 'suspended') {
        node.ctx.resume().catch(() => {});
      }
    } catch (e) {
      // 部分由于跨域未配置 crossOrigin 的视频可能报错，安全跳过
      console.warn('[VideoMaster] Audio boost cross-origin restriction:', e);
    }
  }
}

export const audioBooster = new AudioBoosterManager();
