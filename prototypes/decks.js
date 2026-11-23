// $KYAULabs: decks.js kyau@aura.kyaulabs 2026/11/22 -0800 Exp $
(() => {
    'use strict';
    const svg = d3.select('#record').append('g').attr('transform', 'translate(150,150)');
    const ring = (r, color, width) => svg.append('circle').attr('r', r).attr('fill', 'none').attr('stroke', color).attr('stroke-width', width);
    ring(128, 'var(--raised)', 23);
    const ticks = d3.range(96);
    svg.selectAll('line').data(ticks).join('line').attr('transform', i => `rotate(${i * 3.75})`).attr('y1', -135).attr('y2', i => i % 8 ? -131 : -121).attr('stroke', i => i % 8 ? 'var(--control-border)' : 'var(--text)');
    d3.range(48, 119, 3).forEach(r => ring(r, r % 2 ? 'var(--border)' : 'var(--raised)', 1));
    svg.append('circle').attr('r', 47).attr('fill', 'var(--surface)').attr('stroke', 'var(--border)');
    const marker = svg.append('line').attr('y1', -55).attr('y2', -112).attr('stroke-width', 5).attr('stroke', 'var(--primary)');
    const label = svg.append('text').attr('text-anchor', 'middle').attr('fill', 'var(--text)').attr('font-family', 'var(--font-display)').attr('font-size', 34).attr('y', 3);
    svg.append('text').attr('text-anchor', 'middle').attr('y', 21).attr('font-family', 'var(--font-mono)').attr('font-size', 10).attr('fill', 'var(--muted)').text('CUE BAR');
    const x = d3.scaleLinear().domain([0, 319]).range([2, 618]);
    const decks = ['a', 'b'].map((id, deck) => {
        const scope = d3.select(`#wave-${id}`);
        scope.selectAll('.beat').data(d3.range(16)).join('line').attr('x1', i => i * 620 / 16).attr('x2', i => i * 620 / 16).attr('y2', 74).attr('stroke', 'var(--border)');
        const bars = scope.selectAll('.sample').data(d3.range(320).map(i => (7 + 25 * Math.abs(Math.sin(.29 * i + deck) * Math.cos(.017 * i + deck)) + 4 * Math.sin(i * 3)) * (deck ? .65 + .35 * Math.sin(i / 42) : 1))).join('line').attr('x1', (_, i) => x(i)).attr('x2', (_, i) => x(i)).attr('stroke', `var(--deck-${id})`).attr('stroke-width', 1.6);
        const needle = scope.append('line').attr('y2', 74).attr('stroke', 'var(--text)').attr('stroke-width', 2);
        return {bars, needle};
    });
    function render() {
        const cue = Number(document.querySelector('#cue').value), mix = Number(document.querySelector('#mix').value);
        const n = String(cue).padStart(2, '0');
        document.querySelector('#bar').value = `Bar ${n}`;
        document.querySelector('#ratio').value = `A ${100 - mix} : ${mix} B`;
        label.text(n);
        marker.attr('transform', `rotate(${(cue - 1) * 22.5})`);
        decks.forEach(({bars, needle}, deck) => {
            const gain = (deck ? mix : 100 - mix) / 100;
            bars.attr('y1', d => 36 - d * gain).attr('y2', d => 38 + d * gain);
            const pos = 1 + (cue - 1) * 620 / 16;
            needle.attr('x1', pos).attr('x2', pos);
        });
    }
    d3.select('.controls').property('hidden', false).selectAll('input').on('input', render);
    render();
})();
// vim: ft=javascript sts=4 sw=4 ts=4 et :
