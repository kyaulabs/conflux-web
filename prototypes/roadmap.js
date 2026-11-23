// $KYAULabs: roadmap.js kyau@aura.kyaulabs 2026/11/22 -0800 Exp $
(() => {
    'use strict';
    const {issues, milestones, date} = confluxSnapshot;
    const byTrack = d3.group(issues, d => d.m);
    const code = m => m.title.split(' — ')[0];
    const name = m => m.title.split(' — ')[1];
    const number = n => String(n).padStart(2, '0');
    function list(rows) {
        const li = d3.select('#credits').selectAll('li').data(rows, d => d.id).join('li');
        li.selectAll('a').data(d => [d]).join('a').attr('href', d => `https://github.com/kyaulabs/conflux/issues/${d.id}`).text(d => d.title);
        li.selectAll('span').data(d => [d]).join('span').attr('class', 'tag').text(d => `#${d.id} / ${d.status}`);
    }
    function setlist() {
        const buttons = d3.select('#tracks').selectAll('button').data(milestones).join('button').attr('class', 'track');
        buttons.append('span').attr('class', 'track-no').text((_, i) => number(i + 1));
        buttons.append('strong').text(name);
        buttons.append('span').attr('class', 'tag').text(d => d.state);
        function cue(m) {
            const rows = byTrack.get(m.id) || [];
            buttons.attr('aria-pressed', d => d === m);
            d3.select('#title').text(name(m));
            d3.select('#cut').text(`${code(m)} / ${m.state.toUpperCase()}`);
            d3.select('#credit').text(`${rows.filter(d => d.status === 'Done').length} of ${rows.length} board issues done`);
            // Cut each issue into a separate band, like grooves on a test pressing.
            const x = d3.scaleBand().domain(rows.map(d => d.id)).range([4, 476]).paddingInner(.1);
            const groove = d3.select('#grooves').selectAll('g').data(rows, d => d.id).join('g').attr('transform', d => `translate(${x(d.id)},0)`);
            groove.each(function(issue) {
                d3.select(this).selectAll('path').data(d3.range(11)).join('path').attr('d', i => `M0,${i * 10 - 14} q${x.bandwidth() / 2},${24 + issue.id % 20} ${x.bandwidth()},4`).attr('stroke', issue.status === 'Done' ? 'var(--accent)' : 'var(--muted)').attr('fill', 'none').attr('stroke-width', 2).attr('stroke-dasharray', issue.status === 'Done' ? null : '3 3');
            });
            list(rows);
        }
        buttons.on('click', (_, m) => {
            cue(m);
            if (matchMedia('(max-width:739px)').matches) d3.select('#title').attr('tabindex', -1).node().focus();
        });
        cue(milestones.find(m => code(m) === 'M2'));
        d3.select('#setlist').property('hidden', false);
    }
    function patchbay() {
        const lanes = ['Todo', 'In Progress', 'Done'];
        const colors = new Map(lanes.map((s, i) => [s, ['var(--deck-b)', 'var(--accent)', 'var(--deck-a)'][i]]));
        const routes = d3.flatRollup(issues, v => v.length, d => d.m, d => d.status).map(([m, lane, count]) => ({m, lane, count}));
        const yIn = d3.scalePoint().domain(milestones.map(m => m.id)).range([25, 295]);
        const yOut = d3.scalePoint().domain(lanes).range([60, 260]);
        const svg = d3.select('#cables');
        const jack = (x, y, stroke) => svg.append('circle').attr('cx', x).attr('cy', y).attr('r', 6).attr('stroke', stroke).attr('stroke-width', 2).attr('fill', 'var(--canvas)');
        const wires = svg.selectAll('path').data(routes).join('path').attr('d', d3.linkHorizontal().source(d => [70, yIn(d.m)]).target(d => [279, yOut(d.lane)]))
            .attr('fill', 'none').attr('stroke', d => colors.get(d.lane)).attr('stroke-width', d => d.count * 1.75);
        milestones.forEach(m => {
            jack(70, yIn(m.id), 'var(--muted)');
            svg.append('text').attr('x', 53).attr('y', yIn(m.id) + 4).attr('text-anchor', 'end').text(code(m));
        });
        lanes.forEach(s => {
            jack(279, yOut(s), colors.get(s));
            svg.append('text').attr('x', 292).attr('y', yOut(s) + 4).text(`${s} · ${issues.filter(d => d.status === s).length}`);
        });
        const select = d3.select('#lane');
        select.selectAll('option').data(['All lanes', ...lanes]).join('option').text(s => s);
        function route() {
            const lane = select.property('value'), all = lane === 'All lanes';
            const rows = all ? issues : issues.filter(d => d.status === lane);
            wires.attr('opacity', d => all || d.lane === lane ? .9 : .09);
            d3.select('#scope').text(`${rows.length} issues routed from ${new Set(rows.map(d => d.m)).size} milestones.`);
            list(rows);
        }
        select.on('change', route);
        route();
        d3.select('#patch').property('hidden', false);
        d3.select('#sheet').property('hidden', false);
    }
    document.querySelector('#source').prepend(`${date} UTC · `);
    if (document.querySelector('#patch')) patchbay(); else setlist();
})();
// vim: ft=javascript sts=4 sw=4 ts=4 et :
