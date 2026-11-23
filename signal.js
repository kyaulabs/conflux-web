// $KYAULabs: signal.js kyau@aura.kyaulabs 2026/11/22 -0800 Exp $
/* Decorative dual-channel beat display. No audio playback or device access. */
(() => {
  'use strict';
  const mount = document.querySelector('.signal-background');
  if (!mount || !window.d3) return;
  const width = 1280;
  const svg = d3.select(mount).append('svg').attr('viewBox', `0 0 ${width} 800`)
    .attr('preserveAspectRatio', 'none').attr('focusable', 'false');
  const channels = [{y: 234, ink: 'var(--deck-a)', phase: 0}, {y: 548, ink: 'var(--deck-b)', phase: 2.3}];
  const lanes = svg.selectAll('g').data(channels).join('g').attr('transform', d => `translate(0,${d.y})`);
  const grid = d3.range(0, width + 1, 20);
  lanes.append('path').attr('d', grid.map((x,i) => `M${x},-68v${i % 4 ? 3 : 10} M${x},68v-${i % 4 ? 3 : 10}`).join(''))
    .attr('stroke', 'var(--muted)').attr('opacity', .24);
  const spacing = 4;
  const points = d3.range(0, width + spacing + 1, spacing);
  const area = d3.area().x(d => d.x).y0(d => -d.amp).y1(d => d.amp);
  const waves = lanes.append('path').attr('class', 'wave').attr('fill', d => d.ink).attr('fill-opacity', .12)
    .attr('stroke', d => d.ink).attr('stroke-opacity', .57).attr('stroke-width', 1);
  const playhead = svg.append('g').attr('transform', 'translate(320,0)').attr('fill', 'var(--primary)');
  channels.forEach(({y}) => {
    playhead.append('path').attr('d', `M-5,${y-72}h10l-5,7Z`);
    playhead.append('line').attr('y1', y-65).attr('y2', y+65).attr('stroke','var(--primary)').attr('opacity', .5);
  });
  function draw(time) {
    // Slide the same samples across the display rather than resampling a
    // moving signal on fixed pixels, which makes narrow peaks swell and shrink.
    const travel = time * .042;
    const offset = travel % spacing;
    const origin = travel - offset;
    channels.forEach((channel, i) => {
      const samples = points.map(x => {
        const u = (x + origin) / 80 + channel.phase;
        const body = 9 + 30 * Math.exp(-3 * (u % 1)) + 12 * Math.cos(u * .8);
        const amp = 2 + Math.abs(Math.sin(13 * u) * .62 + Math.sin(37 * u + i) * .38) * body;
        return {x: x - offset, amp};
      });
      waves.filter(d => d === channel).attr('d', area(samples));
    });
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer, elapsed = 0;
  function sync() {
    timer?.stop();
    if (document.hidden || reduced.matches || document.body.classList.contains('motion-paused')) return;
    const start = elapsed;
    timer = d3.interval(t => draw(elapsed = start + t), 60);
  }
  draw(0);
  sync();
  document.addEventListener('conflux:motionchange', sync);
  reduced.addEventListener('change', sync);
})();
// vim: ft=javascript sts=4 sw=4 ts=4 et :
