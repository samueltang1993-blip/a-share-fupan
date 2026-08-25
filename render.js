/* 渲染层：全部内容由 window.REVIEW_DATA 驱动 */
(function(){
const D = window.REVIEW_DATA;
const $ = id => document.getElementById(id);
const UP = '#d43a3a', DOWN = '#0d9e6e', GOLD = '#b8860b', BLUE = '#33507e', GRAY = '#8a93a6';
const fmt = (x,d=2)=> x==null?'—':Number(x).toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d});
const cls = v => v>0?'up':(v<0?'down':'');
const sign = (v,d=2)=> (v>0?'+':'')+fmt(v,d);
const charts = [];
function mk(id, opt){ const c = echarts.init($(id)); c.setOption(opt); charts.push(c); return c; }
window.addEventListener('resize', ()=>charts.forEach(c=>c.resize()));
const baseGrid = {left:56,right:56,top:36,bottom:44};
const legendTop = {top:6};
const tipAxis = {trigger:'axis',axisPointer:{type:'cross'}};

/* 头部 */
$('title').textContent = D.text.title;
$('hero_sub').textContent = D.text.hero_sub;
$('conclusion').innerHTML = D.text.conclusion;
$('strip').innerHTML = D.text.strip.map(c=>
  `<div class="chip tone-${c.tone==='up'?'up':(c.tone==='down'?'down':'flat')}"><div class="l">${c.label}</div><div class="v">${c.value}</div><div class="s">${c.sub||''}</div></div>`).join('');
$('foot').textContent = D.text.foot;
['1','2','3','4','5','6','7','8'].forEach(i=>$('note'+i).textContent=D.text.notes['s'+i]||'');
$('note4b').textContent=D.text.notes['s4b']||'';

/* as-of 标签 */
$('asof1').textContent='as-of '+D.date;
$('asof2').textContent='as-of '+D.date;
$('asof4').textContent='as-of '+D.date;
$('asof5').textContent='as-of '+D.date;
$('asof8').textContent='展望 '+(D.outlook&&D.outlook.next_trade_date||'')+'（概率为主观情景判断，非预测）';
/* 模块守卫：数据源降级/缺失时整节隐藏，不报错 */
if (D.margin && D.margin.dates_full && D.margin.dates_full.length)
  $('asof3').textContent='as-of '+(D.margin.dates_full.slice(-1)[0]||'')+'（T+1）';
else $('s3').style.display='none';
if (D.etf && D.etf.rows && D.etf.rows.length)
  $('asof6').textContent='成交 as-of '+D.date+'，份额 as-of '+(D.etf.rows[0].shr_asof||'').replace(/(\d{4})(\d{2})(\d{2})/,'$1-$2-$3')+'（T+1）';
else $('s6').style.display='none';
if (D.macro && D.macro.dr007 && D.macro.dr007.v && D.macro.dr007.v.length) $('asof7').textContent='as-of '+D.date;
else $('s7').style.display='none';
if (!(D.flow && D.flow.l1_in && D.flow.l1_in.length)) $('s4').style.display='none';
if (D.ind_bias && D.ind_bias.rows && D.ind_bias.rows.length) $('asof4b').textContent='as-of '+(D.ind_bias.asof||D.date);
else $('s4b').style.display='none';
if (!(D.lhb && D.lhb.buy)) $('s5').style.display='none';
if (!D.nh_detail) $('nh_grid').style.display='none';

/* ① 指数表 */
(function(){
  const rows = Object.entries(D.indices).map(([name,s])=>{
    const i = s.close.length-1, p = s.pct[i];
    const hi = Math.max(...s.close), lo = Math.min(...s.close);
    const pos = (s.close[i]-lo)/(hi-lo)*100;
    return `<tr><td>${name}</td><td>${fmt(s.close[i])}</td><td class="${cls(p)}">${sign(p)}%</td><td>${fmt(s.amt[i],0)}</td><td>${fmt(pos,0)}%</td></tr>`;
  }).join('');
  $('idx_table').innerHTML = `<tr><th>指数</th><th>收盘</th><th>涨跌幅</th><th>成交额(亿)</th><th>区间位置*</th></tr>${rows}
    <tr><td colspan="5" style="text-align:left;font-size:11.5px;color:var(--sub)">* 区间位置 = 收盘在本页展示窗口（${D.indices['上证指数'].dates_full[0]} 起）最高/最低价之间的相对位置</td></tr>`;
})();
mk('c_turn', {
  tooltip: tipAxis, legend: {...legendTop,data:['两市成交额','较前日变化']}, grid: baseGrid,
  xAxis: {type:'category', data: D.turnover.dates},
  yAxis: [{type:'value',name:'亿元'},{type:'value',name:'亿元',splitLine:{show:false}}],
  series: [
    {name:'两市成交额',type:'bar',data:D.turnover.total,itemStyle:{color:'#9db4d8'},barMaxWidth:10},
    {name:'较前日变化',type:'line',yAxisIndex:1,data:D.turnover.total.map((v,i)=>i?Math.round(v-D.turnover.total[i-1]):0),
     lineStyle:{color:GOLD,width:1.6},itemStyle:{color:GOLD},symbol:'none',smooth:true}
  ],
  dataZoom:[{type:'inside'},{type:'slider',height:16,bottom:8}]
});

/* ② 涨跌停 + 炸板率 */
const B = D.breadth;
mk('c_limit', {
  tooltip: tipAxis, legend: {...legendTop,data:['涨停','跌停','炸板','炸板率(右)']}, grid: baseGrid,
  xAxis: {type:'category', data: B.dates},
  yAxis: [{type:'value',name:'家'},{type:'value',name:'%',min:0,max:60,splitLine:{show:false}}],
  series: [
    {name:'涨停',type:'bar',stack:'l',data:B.up_limit,itemStyle:{color:UP},barMaxWidth:10},
    {name:'跌停',type:'bar',stack:'l',data:B.down_limit.map(v=>-v),itemStyle:{color:DOWN},barMaxWidth:10},
    {name:'炸板',type:'bar',data:B.broken,itemStyle:{color:'#e8b04b'},barMaxWidth:10},
    {name:'炸板率(右)',type:'line',yAxisIndex:1,data:B.broken_rate,lineStyle:{color:'#5a4a8a',width:1.6,type:'dashed'},itemStyle:{color:'#5a4a8a'},symbol:'none',smooth:true}
  ],
  dataZoom:[{type:'inside'},{type:'slider',height:16,bottom:8}]
});
mk('c_nhnl', {
  tooltip: tipAxis, legend: {...legendTop,data:['创新高','创新低']}, grid: baseGrid,
  xAxis: {type:'category', data: B.dates},
  yAxis: {type:'value',name:'家'},
  series: [
    {name:'创新高',type:'bar',data:B.new_high,itemStyle:{color:UP},barMaxWidth:10},
    {name:'创新低',type:'bar',data:B.new_low.map(v=>-v),itemStyle:{color:DOWN},barMaxWidth:10}
  ],
  dataZoom:[{type:'inside'},{type:'slider',height:16,bottom:8}]
});
/* ②b 历史新高个股 */
(function(){
  const NH = D.nh_detail || {count:0, rows:[]};
  $('nh_title').innerHTML = `历史新高个股<span class="u">当日 ${NH.count} 家 · 按申万二级行业分组</span>`;
  const byInd = {};
  NH.rows.forEach(x=>{ const k = x.ind2||'—'; (byInd[k]=byInd[k]||[]).push(x); });
  $('nh_list').innerHTML = Object.entries(byInd).sort((a,b)=>b[1].length-a[1].length).map(([ind,arr])=>
    `<div style="margin-bottom:9px;line-height:2"><span class="badge" style="background:#e8edf5;color:#33507e">${ind}</span> ` +
    arr.map(x=>`<span class="badge">${x.name}</span>`).join(' ') +
    ` <span style="color:var(--sub);font-size:12px">${arr.length}家</span></div>`).join('')
    || '<span style="color:var(--sub)">当日无收盘价创历史新高个股</span>';
  mk('c_nh', {
    tooltip: tipAxis, legend: {...legendTop,data:['历史新高家数']}, grid: baseGrid,
    xAxis: {type:'category', data: B.dates},
    yAxis: {type:'value', name:'家'},
    series: [{name:'历史新高家数',type:'bar',data:B.new_high,itemStyle:{color:UP},barMaxWidth:10}],
    dataZoom:[{type:'inside'},{type:'slider',height:16,bottom:8}]
  });
})();

/* 天梯 */
(function(){
  const L = D.ladder;
  $('ladder_title').textContent = D.text.ladder_title;
  const byLbc = {};
  L.ladder.forEach(x=>{(byLbc[x.lbc]=byLbc[x.lbc]||[]).push(x);});
  const rows = Object.keys(byLbc).sort((a,b)=>b-a).map(k=>{
    const items = byLbc[k].map(x=>`<span class="badge ${k==L.max_lianban?'max':''}">${x.name}</span><span style="color:var(--sub);font-size:12px">${x.theme}</span>`).join('　');
    return `<tr><td style="white-space:nowrap;font-weight:700">${k}连板</td><td><div class="ladder-td">${items}</div></td></tr>`;
  }).join('');
  $('ladder_table').innerHTML = `<tr><th style="width:90px">梯队</th><th>个股（题材）</th></tr>${rows}`;
  $('ladder_extra').textContent = `来源：${L.source}。「N天M板」非严格连板个股见当日导读，不列入天梯表。`;
})();

/* ③ 两融（缺失时跳过） */
if (D.margin && D.margin.dates && D.margin.dates.length)
mk('c_margin', {
  tooltip: tipAxis, legend: {...legendTop,data:['融资余额','融券余额(右)']}, grid: baseGrid,
  xAxis: {type:'category', data: D.margin.dates},
  yAxis: [{type:'value',name:'融资余额(亿)',scale:true},{type:'value',name:'融券(亿)',scale:true,splitLine:{show:false}}],
  series: [
    {name:'融资余额',type:'line',data:D.margin.rzye,areaStyle:{opacity:.12},lineStyle:{color:BLUE,width:1.8},itemStyle:{color:BLUE},symbol:'none',smooth:true},
    {name:'融券余额(右)',type:'line',yAxisIndex:1,data:D.margin.rqye,lineStyle:{color:GOLD,width:1.4},itemStyle:{color:GOLD},symbol:'none',smooth:true}
  ],
  dataZoom:[{type:'inside'},{type:'slider',height:16,bottom:8}]
});

/* ④ 资金流（缺失时跳过） */
if (D.flow && D.flow.l1_in && D.flow.l1_in.length) (function(){
  const F = D.flow;
  const block = (title, arr, isIn)=>{
    const mx = Math.max(...arr.map(x=>Math.abs(x.v)));
    const items = arr.map(x=>`
      <div class="flow-item"><span>${x.name}</span><span class="${x.v>=0?'up':'down'}">${sign(x.v)} 亿</span></div>
      <div class="bar"><i style="width:${Math.abs(x.v)/mx*100}%;background:${x.v>=0?UP:DOWN}"></i></div>`).join('');
    return `<div class="card"><h3>${title}</h3>${items}</div>`;
  };
  $('flow_grid').innerHTML =
    block('申万一级 · 净流入 TOP5', F.l1_in, true) + block('申万一级 · 净流出 TOP5', F.l1_out, false) +
    block('申万二级 · 净流入 TOP5', F.l2_in, true) + block('申万二级 · 净流出 TOP5', F.l2_out, false);
})();


/* ④b 行业乖离率（缺失时跳过） */
if (D.ind_bias && D.ind_bias.rows && D.ind_bias.rows.length) (function(){
  const IB = D.ind_bias;
  const head = `<tr><th>分类</th>${IB.dates.map(d=>`<th>${d.replace('/','-')}</th>`).join('')}</tr>`;
  const rows = IB.rows.map(r=>`<tr><td>${r.name}</td>` + r.v.map(v=>{
    const c = v==null?'':(v>5?'up':(v<-5?'down':''));
    return `<td class="${c}">${v==null?'—':fmt(v)}</td>`;
  }).join('') + `</tr>`).join('');
  $('indbias_table').innerHTML = head + rows;
})();

/* ⑤ 龙虎榜 */
function lhbTable(id, arr, isBuy){
  const rows = arr.map(x=>`<tr><td>${x.name}<span style="color:var(--sub);font-size:11.5px"> ${x.code}</span></td>
    <td class="${cls(x.pct)}">${x.pct==null?'—':sign(x.pct)+'%'}</td>
    <td class="${isBuy?'up':'down'}">${sign(x.net,0)}</td><td>${sign(x.ratio)}%</td>
    <td>${x.window==='3日'?'<span class="win">3日窗口</span>':'当日'}</td></tr>`).join('');
  $(id).innerHTML = `<tr><th>个股</th><th>涨跌幅</th><th>机构净${isBuy?'买':'卖'}(万)</th><th>占比</th><th>窗口</th></tr>${rows||'<tr><td colspan=5 style="text-align:center;color:var(--sub)">当日无上榜</td></tr>'}`;
}
if (D.lhb && D.lhb.buy){
lhbTable('lhb_buy', D.lhb.buy, true);
lhbTable('lhb_sell', D.lhb.sell, false);
}
/* ⑤b 机构当日净买入趋势 */
(function(){
  const LI = D.lhb_inst || {dates:[], dates_full:[], v:[]};
  const last = LI.v.length ? LI.v[LI.v.length-1] : null;
  $('lhbinst_title').innerHTML = `机构当日净买入<span class="u">当日 ${last==null?'—':sign(last)+' 亿'} · 龙虎榜机构席位合计</span>`;
  mk('c_lhbinst', {
    tooltip: tipAxis, legend: {...legendTop,data:['机构当日净买入']}, grid: baseGrid,
    xAxis: {type:'category', data: LI.dates},
    yAxis: {type:'value', name:'亿元'},
    series: [{name:'机构当日净买入',type:'bar',barMaxWidth:10,
      data: LI.v.map(v=>({value:v, itemStyle:{color: v>=0?UP:DOWN}}))}],
    dataZoom:[{type:'inside'},{type:'slider',height:16,bottom:8}]
  });
})();

/* ⑥ ETF（缺失时跳过） */
if (D.etf && D.etf.rows && D.etf.rows.length) (function(){
  const rows = D.etf.rows.map(r=>`<tr><td>${r.name}<span style="color:var(--sub);font-size:11.5px"> ${r.code}</span></td>
    <td>${fmt(r.amt_today)}</td><td>${fmt(r.shr_latest)}</td>
    <td class="${cls(r.shr_wow)}">${sign(r.shr_wow)}</td><td class="${cls(r.shr_mom)}">${sign(r.shr_mom)}</td></tr>`).join('');
  $('etf_table').innerHTML = `<tr><th>ETF</th><th>当日成交(亿)</th><th>最新份额(亿份)</th><th>周变动</th><th>月变动</th></tr>${rows}`;
  const codes = Object.keys(D.etf.shr_series);
  const colors = ['#33507e','#b8860b','#d43a3a','#0d9e6e','#5a4a8a'];
  mk('c_etf', {
    tooltip: tipAxis, legend: {...legendTop}, grid: baseGrid,
    xAxis: {type:'category', data: D.etf.shr_series[codes[0]].dates},
    yAxis: {type:'value',name:'亿份',scale:true},
    series: codes.map((c,i)=>({name:D.etf.names[c],type:'line',data:D.etf.shr_series[c].v,
      lineStyle:{color:colors[i%colors.length],width:1.6},itemStyle:{color:colors[i%colors.length]},symbol:'none',smooth:true})),
    dataZoom:[{type:'inside'},{type:'slider',height:16,bottom:8}]
  });
})();

/* ⑦ 宏观（缺失时跳过） */
if (D.macro && D.macro.dr007 && D.macro.dr007.v && D.macro.dr007.v.length){
mk('c_rates', {
  tooltip: tipAxis, legend: {...legendTop,data:['DR007','10Y国债']}, grid: baseGrid,
  xAxis: {type:'category', data: D.macro.dr007.dates},
  yAxis: {type:'value',name:'%',scale:true},
  series: [
    {name:'DR007',type:'line',data:D.macro.dr007.v,lineStyle:{color:BLUE,width:1.8},itemStyle:{color:BLUE},symbol:'none',smooth:true},
    {name:'10Y国债',type:'line',data:D.macro.y10.v,lineStyle:{color:GOLD,width:1.6},itemStyle:{color:GOLD},symbol:'none',smooth:true}
  ],
  dataZoom:[{type:'inside'},{type:'slider',height:16,bottom:8}]
});
mk('c_omo', {
  tooltip: tipAxis, legend: {...legendTop,data:['投放','到期','净投放(右)']}, grid: baseGrid,
  xAxis: {type:'category', data: D.macro.omo.dates},
  yAxis: [{type:'value',name:'亿元'},{type:'value',name:'亿元',splitLine:{show:false}}],
  series: [
    {name:'投放',type:'bar',data:D.macro.omo.inject,itemStyle:{color:UP},barMaxWidth:9},
    {name:'到期',type:'bar',data:D.macro.omo.mature.map(v=>-v),itemStyle:{color:DOWN},barMaxWidth:9},
    {name:'净投放(右)',type:'line',yAxisIndex:1,data:D.macro.omo.inject.map((v,i)=>Math.round(v-D.macro.omo.mature[i])),
     lineStyle:{color:GOLD,width:1.6},itemStyle:{color:GOLD},symbol:'none',smooth:true}
  ],
  dataZoom:[{type:'inside'},{type:'slider',height:16,bottom:8}]
});
}

/* ⑧ 次日关注（概率化情景展望，人工撰写，管线不覆盖） */
if (D.outlook && D.outlook.signals){
  $('outlook_list').innerHTML = D.outlook.signals.map(s=>
   `<div class="sig">
     <div class="sig-t"><span class="tag">${s.tag}</span>${s.title}</div>
     <div class="sig-w">${s.watch}</div>
     ${s.scenarios.map(c=>`<div class="scn ${c.tone||'flat'}"><span class="p">${c.prob}</span><span class="lb">${c.label}</span><span class="ds">${c.desc}</span></div>`).join('')}
    </div>`).join('');
}
})();
