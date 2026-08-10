import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ScanLine, Boxes, FileText, BarChart3, RefreshCw, ShieldCheck, Search,
  ArrowRight, ArrowLeft, X, Printer, Truck, Wrench, AlertTriangle, Check,
  ChevronRight, Building2, Calendar, DollarSign, Layers, Clock,
  ClipboardList, Plus, Trash2, Send, Lock, Pencil
} from "lucide-react";
import { useStore, useAvailability } from "./store.js";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Line, ComposedChart, Legend
} from "recharts";

/* ============================================================
   CONTRACTOR LEASING SOLUTIONS — rental asset control
   Prototype for a Florida temp equipment / furnishings / tech
   rental operation serving general contractors.
   Seeded demo data. No backend calls.
   ============================================================ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;450;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

.ld * { box-sizing: border-box; }
.ld {
  --concrete:#E7EAE5;
  --panel:#FFFFFF;
  --panel-2:#F3F5F1;
  --ink:#11181C;
  --steel:#1A2630;
  --steel-2:#26343F;
  --steel-3:#3A4C58;
  --line:#CBD1C9;
  --line-2:#DDE1DA;
  --signal:#EF5A0C;
  --hivis:#D8C400;
  --go:#0D7355;
  --stop:#A32A1C;
  --muted:#6A776F;
  --display:'Barlow Condensed', Impact, sans-serif;
  --body:'IBM Plex Sans', system-ui, sans-serif;
  --mono:'IBM Plex Mono', ui-monospace, monospace;
  font-family: var(--body);
  color: var(--ink);
  background: var(--concrete);
  min-height:100vh;
  display:flex;
  font-size:14px;
  -webkit-font-smoothing:antialiased;
}
.ld button { font-family:inherit; cursor:pointer; }
.ld h1,.ld h2,.ld h3 { margin:0; font-family:var(--display); font-weight:600; letter-spacing:.02em; }

/* ---- rail ---- */
.rail { width:196px; flex:0 0 196px; background:var(--steel); color:#C6D0CC; display:flex; flex-direction:column; position:sticky; top:0; height:100vh; }
.brand { padding:20px 18px 16px; border-bottom:1px solid var(--steel-2); }
.brand .mark { font-family:var(--display); font-size:21px; line-height:.94; letter-spacing:.05em; color:#fff; font-weight:700; }
.brand .mark em { font-style:normal; color:var(--signal); }
.brand .mark .abbr { display:none; font-size:26px; letter-spacing:.08em; }
.brand .sub { font-family:var(--mono); font-size:9.5px; letter-spacing:.14em; text-transform:uppercase; color:#7E8E88; margin-top:7px; }
.navlist { padding:10px 8px; flex:1; }
.navbtn { width:100%; display:flex; align-items:center; gap:10px; padding:9px 10px; background:none; border:0; border-left:3px solid transparent;
  color:#9DAAA4; font-family:var(--display); font-size:16px; letter-spacing:.07em; text-transform:uppercase; text-align:left; transition:.14s; }
.navbtn:hover { color:#fff; background:var(--steel-2); }
.navbtn.on { color:#fff; background:var(--steel-2); border-left-color:var(--signal); }
.navbtn .cnt { margin-left:auto; font-family:var(--mono); font-size:10px; letter-spacing:0; color:#7E8E88; }
.railfoot { padding:14px 16px; border-top:1px solid var(--steel-2); font-family:var(--mono); font-size:10px; line-height:1.7; color:#7E8E88; }
.railfoot b { color:#C6D0CC; font-weight:500; }

/* ---- shell ---- */
.main { flex:1; min-width:0; }
.topbar { display:flex; align-items:baseline; gap:14px; padding:22px 28px 16px; border-bottom:1px solid var(--line); background:var(--concrete); position:sticky; top:0; z-index:20; }
.topbar h1 { font-size:30px; line-height:1; text-transform:uppercase; }
.topbar .desc { color:var(--muted); font-size:13px; }
.topbar .clock { margin-left:auto; font-family:var(--mono); font-size:11px; color:var(--muted); }
.wrap { padding:22px 28px 60px; max-width:1320px; }

/* ---- primitives ---- */
.panel { background:var(--panel); border:1px solid var(--line); }
.phead { display:flex; align-items:center; gap:10px; padding:11px 14px; border-bottom:1px solid var(--line-2); }
.phead h3 { font-size:17px; text-transform:uppercase; letter-spacing:.05em; }
.phead .note { margin-left:auto; font-family:var(--mono); font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:.08em; }
.eyebrow { font-family:var(--mono); font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); }
.grid { display:grid; gap:14px; }
.g4 { grid-template-columns:repeat(4,1fr); }
.g3 { grid-template-columns:repeat(3,1fr); }
.g2 { grid-template-columns:repeat(2,1fr); }
.mono { font-family:var(--mono); }

.stat { padding:14px; background:var(--panel); border:1px solid var(--line); }
.stat .k { font-family:var(--mono); font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); }
.stat .v { font-family:var(--display); font-size:38px; line-height:1.05; margin-top:6px; font-weight:600; }
.stat .v small { font-size:17px; color:var(--muted); font-weight:500; }
.stat .f { font-size:11.5px; color:var(--muted); margin-top:3px; }
.stat.accent { border-left:3px solid var(--signal); }

.tbl { width:100%; border-collapse:collapse; }
.tbl th { font-family:var(--mono); font-size:9.5px; letter-spacing:.11em; text-transform:uppercase; color:var(--muted);
  text-align:left; padding:8px 12px; border-bottom:1px solid var(--line); font-weight:500; white-space:nowrap; }
.tbl td { padding:9px 12px; border-bottom:1px solid var(--line-2); font-size:13px; vertical-align:middle; }
.tbl tr:last-child td { border-bottom:0; }
.tbl tbody tr.click:hover { background:var(--panel-2); cursor:pointer; }
.num { text-align:right; font-family:var(--mono); font-variant-numeric:tabular-nums; }

.pill { display:inline-flex; align-items:center; gap:5px; font-family:var(--mono); font-size:9.5px; letter-spacing:.1em;
  text-transform:uppercase; padding:3px 7px; border:1px solid; white-space:nowrap; }
.p-go { color:var(--go); border-color:var(--go); background:rgba(13,115,85,.07); }
.p-out { color:#1B4C7A; border-color:#1B4C7A; background:rgba(27,76,122,.07); }
.p-due { color:#8A6D00; border-color:var(--hivis); background:rgba(216,196,0,.14); }
.p-stop { color:var(--stop); border-color:var(--stop); background:rgba(163,42,28,.07); }
.p-svc { color:#6A4E9C; border-color:#6A4E9C; background:rgba(106,78,156,.07); }
.p-grey { color:var(--muted); border-color:var(--line); background:var(--panel-2); }

.btn { display:inline-flex; align-items:center; gap:7px; border:1px solid var(--steel); background:var(--steel); color:#fff;
  font-family:var(--display); font-size:15px; letter-spacing:.06em; text-transform:uppercase; padding:8px 15px; transition:.14s; }
.btn:hover { background:var(--steel-2); }
.btn.sig { background:var(--signal); border-color:var(--signal); }
.btn.sig:hover { background:#D24E06; }
.btn.ghost { background:transparent; color:var(--ink); border-color:var(--line); }
.btn.ghost:hover { background:var(--panel-2); }
.btn:disabled { opacity:.35; cursor:not-allowed; }
.btn.sm { padding:5px 10px; font-size:13px; }

.input { font-family:var(--body); font-size:13px; padding:7px 10px; border:1px solid var(--line); background:var(--panel); color:var(--ink); }
.input:focus, .btn:focus-visible, .navbtn:focus-visible, .tbl tr.click:focus-visible { outline:2px solid var(--signal); outline-offset:1px; }
.chips { display:flex; gap:6px; flex-wrap:wrap; }
.chip { font-family:var(--mono); font-size:10px; letter-spacing:.08em; text-transform:uppercase; padding:5px 9px;
  border:1px solid var(--line); background:var(--panel); color:var(--muted); }
.chip.on { background:var(--steel); border-color:var(--steel); color:#fff; }

/* ---- asset plate (signature) ---- */
.plate { background:var(--steel); border:1px solid #0C1116; padding:11px 11px 0; position:relative; color:#fff; width:100%; }
.plate::before { content:''; position:absolute; top:9px; right:10px; width:9px; height:9px; border-radius:50%;
  background:var(--concrete); box-shadow:inset 0 1px 2px rgba(0,0,0,.6); }
.plate .ptag { font-family:var(--display); font-size:22px; letter-spacing:.13em; line-height:1; font-weight:700; }
.plate .pname { font-family:var(--mono); font-size:9.5px; letter-spacing:.05em; color:#93A29B; margin-top:5px;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.plate .qr { margin:10px 0 9px; display:grid; }
.plate .band { margin:0 -11px; height:7px; }
.plate.lg .ptag { font-size:31px; }
.plate.lg .pname { font-size:11px; }

/* ---- scan bay ---- */
.bay { display:grid; grid-template-columns:1.15fr .85fr; gap:14px; align-items:start; }
.console { background:var(--steel); border:1px solid #0C1116; padding:22px; color:#fff; }
.console .lamp { display:flex; align-items:center; gap:9px; font-family:var(--mono); font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:#93A29B; }
.lamp i { width:8px; height:8px; border-radius:50%; background:var(--go); display:block; animation:pulse 2.4s infinite; }
.lamp.busy i { background:var(--hivis); }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.32} }
.scanrow { display:flex; gap:0; margin-top:16px; }
.scanrow input { flex:1; background:#0E161C; border:1px solid var(--steel-3); border-right:0; color:#fff;
  font-family:var(--mono); font-size:19px; letter-spacing:.13em; padding:13px 15px; }
.scanrow input::placeholder { color:#4E6069; letter-spacing:.1em; }
.scanrow input:focus { outline:none; border-color:var(--signal); }
.scanrow button { border:1px solid var(--signal); background:var(--signal); color:#fff; font-family:var(--display);
  font-size:17px; letter-spacing:.08em; text-transform:uppercase; padding:0 20px; }
.hintrow { display:flex; gap:6px; flex-wrap:wrap; margin-top:11px; }
.hintrow button { background:#0E161C; border:1px solid var(--steel-3); color:#93A29B; font-family:var(--mono); font-size:10px;
  letter-spacing:.09em; padding:5px 8px; }
.hintrow button:hover { color:#fff; border-color:var(--signal); }
.feed { background:#0E161C; border:1px solid var(--steel-3); padding:11px 13px; max-height:260px; overflow:auto; }
.feed .row { font-family:var(--mono); font-size:11px; color:#93A29B; padding:4px 0; border-bottom:1px dotted #24323A; display:flex; gap:9px; }
.feed .row:last-child { border-bottom:0; }
.feed .row b { color:#fff; font-weight:500; }
.feed .row .o { color:var(--signal); }
.feed .row .i { color:#37B98F; }
.slide { animation:slide .22s ease-out; }
@keyframes slide { from{opacity:0; transform:translateY(7px)} to{opacity:1; transform:none} }

/* ---- drawer ---- */
.scrim { position:fixed; inset:0; background:rgba(17,24,28,.45); z-index:60; }
.drawer { position:fixed; top:0; right:0; bottom:0; width:min(560px,94vw); background:var(--concrete);
  border-left:1px solid var(--line); z-index:61; overflow:auto; animation:din .2s ease-out; }
@keyframes din { from{transform:translateX(26px); opacity:.4} to{transform:none; opacity:1} }
.dhead { display:flex; align-items:flex-start; gap:14px; padding:18px; background:var(--steel); color:#fff; }
.dhead h2 { font-size:25px; line-height:1.05; text-transform:uppercase; }
.dhead .sk { font-family:var(--mono); font-size:10.5px; color:#93A29B; letter-spacing:.09em; margin-top:5px; }
.dclose { margin-left:auto; background:none; border:1px solid var(--steel-3); color:#93A29B; padding:5px; }
.dclose:hover { color:#fff; border-color:#fff; }
.dbody { padding:18px; display:flex; flex-direction:column; gap:14px; }
.kv { display:grid; grid-template-columns:1fr auto; gap:5px 12px; font-size:13px; }
.kv dt { color:var(--muted); }
.kv dd { margin:0; font-family:var(--mono); font-variant-numeric:tabular-nums; text-align:right; }

.ladder { display:flex; flex-direction:column; }
.ladder .step { display:flex; align-items:center; gap:10px; padding:8px 12px; border-bottom:1px solid var(--line-2); }
.ladder .step:last-child { border-bottom:0; }
.ladder .lvl { font-family:var(--mono); font-size:9.5px; color:#fff; background:var(--steel-3); width:19px; height:19px;
  display:grid; place-items:center; flex:0 0 19px; }
.ladder .nm { font-family:var(--display); font-size:16px; letter-spacing:.05em; text-transform:uppercase; }
.ladder .cv { margin-left:auto; font-family:var(--mono); font-size:11px; color:var(--muted); }

.bar { height:8px; background:var(--line-2); overflow:hidden; }
.bar i { display:block; height:100%; background:var(--signal); }
.split { display:flex; height:26px; border:1px solid var(--line); }
.split div { display:grid; place-items:center; font-family:var(--mono); font-size:10px; color:#fff; overflow:hidden; }

.notice { border-left:3px solid var(--signal); background:var(--panel); padding:11px 13px; font-size:12.5px; color:var(--muted); line-height:1.6; }
.notice b { color:var(--ink); font-weight:600; }
pre.csv { font-family:var(--mono); font-size:11px; background:#0E161C; color:#93A29B; padding:13px; overflow:auto; max-height:300px; margin:0; }

/* ---- scan bay controls ---- */
.modesw { display:flex; border:1px solid var(--steel-3); }
.modesw button { display:flex; align-items:center; gap:6px; background:#0E161C; border:0; color:#93A29B;
  font-family:var(--display); font-size:15px; letter-spacing:.07em; text-transform:uppercase; padding:8px 15px; }
.modesw button + button { border-left:1px solid var(--steel-3); }
.modesw button.on.out { background:var(--signal); color:#fff; }
.modesw button.on.in { background:#0D7355; color:#fff; }
.tsel { flex:1; min-width:210px; background:#0E161C; border:1px solid var(--steel-3); color:#fff;
  font-family:var(--mono); font-size:12px; padding:8px 10px; }
.tsel:focus { outline:none; border-color:var(--signal); }
.tagchip { display:inline-flex; align-items:center; gap:5px; font-family:var(--mono); font-size:11.5px;
  border:1px solid var(--line); background:var(--panel-2); padding:3px 4px 3px 8px; }
.tagchip button { background:none; border:0; color:var(--muted); padding:1px; display:flex; }
.tagchip button:hover { color:var(--stop); }

/* ---- modal form ---- */
.mwrap { position:fixed; inset:0; background:rgba(17,24,28,.5); z-index:70; overflow:auto; padding:32px 14px; }
.modal { max-width:600px; margin:0 auto; background:var(--concrete); border:1px solid var(--line); }
.mhead { display:flex; align-items:center; gap:12px; padding:15px 18px; background:var(--steel); color:#fff; }
.mhead h3 { font-size:21px; text-transform:uppercase; letter-spacing:.04em; }
.mbody { padding:18px; display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.mbody .full { grid-column:1 / -1; }
.mfoot { padding:14px 18px; border-top:1px solid var(--line); display:flex; gap:9px; justify-content:flex-end; background:var(--panel); }

/* ---- boot / connection states ---- */
.ld.boot { display:grid; place-items:center; background:var(--steel); }
.bootbox { text-align:center; display:flex; flex-direction:column; gap:12px; align-items:center; padding:30px; }
.bootbox .mark { font-family:var(--display); font-size:26px; letter-spacing:.06em; color:#fff; font-weight:700; }
.bootbox .mark em { font-style:normal; color:var(--signal); }
.bootbox .mono { font-family:var(--mono); font-size:11.5px; letter-spacing:.08em; color:#93A29B; max-width:340px; line-height:1.7; }
.bootbox .mono.err { color:var(--signal); }
.bootbox .mono.dim { color:#5C6C74; }
.savelamp { font-family:var(--mono); font-size:9.5px; letter-spacing:.1em; text-transform:uppercase;
  color:#5C6C74; margin-top:9px; }
.savelamp.on { color:var(--signal); }
.toast { position:fixed; top:14px; left:50%; transform:translateX(-50%); z-index:90; display:flex; gap:9px;
  align-items:center; background:var(--steel); color:#fff; border-left:3px solid var(--signal);
  padding:10px 12px; font-size:12.5px; max-width:520px; box-shadow:0 6px 24px rgba(0,0,0,.28); }
.toast button { background:none; border:0; color:#93A29B; display:flex; padding:2px; margin-left:6px; }
.toast button:hover { color:#fff; }

/* ---- quote desk ---- */
.qgrid { display:grid; grid-template-columns:1fr 330px; gap:14px; align-items:start; }
.qside { position:sticky; top:96px; display:flex; flex-direction:column; gap:14px; }
.qhead { display:grid; grid-template-columns:repeat(4,1fr); gap:11px; padding:14px; }
.field { display:flex; flex-direction:column; gap:5px; }
.field label { font-family:var(--mono); font-size:9.5px; letter-spacing:.11em; text-transform:uppercase; color:var(--muted); }
.qline input, .qline select { border:1px solid transparent; background:transparent; padding:3px 5px; font-family:var(--mono); font-size:12.5px; width:100%; color:var(--ink); }
.qline input:hover, .qline select:hover { border-color:var(--line); background:var(--panel-2); }
.qline input:focus, .qline select:focus { border-color:var(--signal); background:var(--panel); outline:none; }
.qline .del { background:none; border:0; color:var(--line-2); padding:2px; }
.qline:hover .del { color:var(--stop); }
.avail { display:flex; align-items:center; gap:7px; }
.dots { display:flex; gap:2px; }
.dots i { width:5px; height:13px; display:block; background:var(--go); }
.dots i.no { background:var(--line-2); }
.wf { display:flex; flex-direction:column; }
.wf .r { display:flex; justify-content:space-between; gap:10px; padding:6px 14px; font-size:12.5px; border-bottom:1px solid var(--line-2); }
.wf .r span:last-child { font-family:var(--mono); font-variant-numeric:tabular-nums; white-space:nowrap; }
.wf .r.sub { background:var(--panel-2); font-weight:600; }
.wf .r.neg span:last-child { color:var(--go); }
.wf .r.tot { background:var(--steel); color:#fff; font-family:var(--display); font-size:19px; letter-spacing:.04em; text-transform:uppercase; padding:11px 14px; border-bottom:0; }
.wf .r.tot span:last-child { font-family:var(--mono); font-size:17px; }
.picker { display:grid; grid-template-columns:repeat(auto-fill,minmax(204px,1fr)); gap:8px; padding:14px; max-height:340px; overflow:auto; }
.pcard { border:1px solid var(--line); background:var(--panel); padding:10px; text-align:left; display:flex; flex-direction:column; gap:6px; }
.pcard:hover:not(:disabled) { border-color:var(--signal); }
.pcard:disabled { opacity:.45; cursor:not-allowed; }
.pcard .n { font-size:12.5px; font-weight:500; line-height:1.3; }
.pcard .s { font-family:var(--mono); font-size:9.5px; letter-spacing:.06em; color:var(--muted); }
.warn { border-left:3px solid var(--hivis); background:rgba(216,196,0,.1); padding:11px 13px; font-size:12.5px; line-height:1.6; }
.warn b { display:block; font-family:var(--display); font-size:16px; text-transform:uppercase; letter-spacing:.05em; margin-bottom:3px; }

/* ---- printed quote ---- */
.paperwrap { position:fixed; inset:0; background:rgba(17,24,28,.55); z-index:70; overflow:auto; padding:26px 14px; }
.paper { max-width:760px; margin:0 auto; background:#fff; border:1px solid var(--line); padding:36px 40px; box-shadow:0 8px 40px rgba(0,0,0,.3); }
.paper .ph { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; border-bottom:3px solid var(--ink); padding-bottom:14px; }
.paper .ph .mk { font-family:var(--display); font-size:27px; letter-spacing:.05em; font-weight:700; line-height:.94; }
.paper .ph .mk span { color:var(--signal); }
.paper .ph .meta { text-align:right; font-family:var(--mono); font-size:10.5px; line-height:1.9; color:var(--muted); }
.paper .ph .meta b { color:var(--ink); font-weight:500; }
.paper h4 { font-family:var(--mono); font-size:9.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); margin:22px 0 7px; font-weight:500; }
.paper .terms { font-size:11px; color:var(--muted); line-height:1.75; }
.paper .sig { display:grid; grid-template-columns:1fr 1fr; gap:34px; margin-top:28px; }
.paper .sig div { border-top:1px solid var(--ink); padding-top:6px; font-family:var(--mono); font-size:9.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); }

.labelgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(176px,1fr)); gap:10px; margin-top:4px; }
.lbl { border:1px dashed var(--line); padding:10px; text-align:center; background:#fff; break-inside:avoid; }
.lbl .lt { font-family:var(--display); font-size:23px; font-weight:700; letter-spacing:.11em; line-height:1; }
.lbl .ln { font-family:var(--mono); font-size:8.5px; letter-spacing:.04em; color:var(--muted); margin-top:4px;
  height:22px; overflow:hidden; line-height:1.3; }
.lbl .lq { display:flex; justify-content:center; margin:6px 0 5px; }
.lbl .lf { font-family:var(--mono); font-size:7px; letter-spacing:.03em; color:var(--muted); }

@media print {
  .ld { display:block; background:#fff; min-height:0; }
  .ld > .rail, .ld > .main, .ld > .scrim, .ld > .drawer { display:none !important; }
  .paperwrap { position:static; inset:auto; background:none; padding:0; overflow:visible; }
  .paper { max-width:none; margin:0; border:0; box-shadow:none; padding:0; }
  .noprint { display:none !important; }
  .tbl td, .tbl th { padding:5px 8px; }
}

@media (prefers-reduced-motion: reduce) { .ld *, .ld *::before { animation:none !important; transition:none !important; } }
@media (max-width: 1080px) {
  .g4 { grid-template-columns:repeat(2,1fr); } .g3,.g2,.bay,.qgrid { grid-template-columns:1fr; }
  .qside { position:static; } .qhead { grid-template-columns:repeat(2,1fr); } .paper { padding:22px; }
  .rail { width:64px; flex:0 0 64px; } .brand .sub,.navbtn span,.railfoot,.navbtn .cnt { display:none; }
  .brand .mark .full { display:none; } .brand .mark .abbr { display:block; }
  .navbtn { justify-content:center; padding:12px 0; }
  .wrap,.topbar { padding-left:14px; padding-right:14px; }
}
`;

/* ---------------- deterministic randomness ---------------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

const DAY = 864e5;
const addDays = (d, n) => new Date(d.getTime() + n * DAY);
const fmtD = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
const money2 = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const monthsBetween = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

/* ---------------- live data ----------------
   Catalog and directory used to be literals in this file. They now arrive
   from Azure SQL through /api/bootstrap. These bindings are populated once
   on load so the hundreds of lookups below keep reading the same names. */
let CATALOG = [];
let CUSTOMERS = [];
let SITES = [];
let COUNTY_SURTAX = {};
let CONFIG = {
  state_tax_pct: 6, damage_waiver_pct: 12, environmental_pct: 2.5,
  approval_threshold_pct: 15, deposit_pct: 25, quote_hold_days: 14, rate_floor_multiple: 1.8,
};
let TODAY = new Date();   // replaced by the server date on bootstrap

function hydrate(d) {
  CATALOG = d.products;
  CUSTOMERS = d.customers.map((c) => ({
    id: c.customer_id, name: c.name, contact: c.contact, phone: c.phone, city: c.city,
    terms: c.terms, disc: Number(c.default_discount), credit: c.credit_status,
    qbo: c.qbo_customer_id,
  }));
  SITES = d.jobsites.map((j) => ({
    id: j.jobsite_id, name: j.name, cust: j.customer_id, county: j.county,
    zone: Number(j.delivery_zone_fee), super: j.superintendent, active: !!j.active,
  }));
  COUNTY_SURTAX = d.countySurtax;
  CONFIG = { ...CONFIG, ...d.config };
  TODAY = new Date(d.serverDate + "T00:00:00");
}
function setDirectory(c, sx) { if (c) CUSTOMERS = c; if (sx) SITES = sx; }
function setCatalog(c) { CATALOG = c; }
const custName = (id) => (CUSTOMERS.find((c) => c.id === id) || {}).name || "\u2014";
const siteRec = (name) => SITES.find((s) => s.name === name) || {};

/* ---------------- CPQ: terms, availability, pricing ----------------
   Rate tiers are day / 7-day week / 28-day month, the rental-industry
   convention. Tax rates below are placeholders for the estimate only —
   QuickBooks computes the real rate from the jobsite address. */
const termsFor = (id) => CUSTOMERS.find((c) => c.id === id) || { disc: 0, credit: "ok" };
/* Read through to CONFIG so a change in the database takes effect on reload
   rather than requiring a deploy. */
const cfg = {
  get tax() { return CONFIG.state_tax_pct; },
  get waiver() { return CONFIG.damage_waiver_pct; },
  get enviro() { return CONFIG.environmental_pct; },
  get approvalAt() { return CONFIG.approval_threshold_pct; },
  get deposit() { return CONFIG.deposit_pct; },
  get holdDays() { return CONFIG.quote_hold_days; },
  get floorMultiple() { return CONFIG.rate_floor_multiple; },
};

const overlap = (aS, aE, bS, bE) => aS <= bE && bS <= aE;
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const fromIso = (v) => new Date(v + "T00:00:00");
const spanDays = (a, b) => Math.max(1, Math.round((b - a) / DAY));

/* Cheapest legal combination of the terms actually offered for this SKU.
   9 days on a lift = 1 week + 2 days, not 9 daily charges. */
function ladder(rates, days) {
  let best = null;
  const maxM = rates.month ? Math.ceil(days / 28) : 0;
  for (let m = 0; m <= maxM; m++) {
    const r1 = days - m * 28;
    const maxW = rates.week ? Math.max(0, Math.ceil(r1 / 7)) : 0;
    for (let w = 0; w <= maxW; w++) {
      const r2 = r1 - w * 7;
      const maxD = rates.day ? Math.max(0, Math.ceil(r2)) : 0;
      for (let d = 0; d <= maxD; d++) {
        if (m * 28 + w * 7 + d < days || m + w + d === 0) continue;
        const cost = m * (rates.month || 0) + w * (rates.week || 0) + d * (rates.day || 0);
        if (!best || cost < best.cost) best = { m, w, d, cost };
      }
    }
  }
  return best || { m: 0, w: 0, d: 0, cost: 0 };
}
const ladderLabel = (l) => [l.m && l.m + " × 28-day", l.w && l.w + " × week", l.d && l.d + " × day"]
  .filter(Boolean).join(" + ") || "—";

/* Client-side availability, kept for instant feedback in the scan bay where
   the answer is about what is standing on a site right now. The quote desk
   asks SQL instead — see cls.fnAvailability — because a page-load snapshot
   cannot see what another desk just quoted. */
function availableFor(sku, start, end, assets, bulk, quotes, skipId) {
  const cat = CATALOG.find((c) => c.sku === sku);
  const held = quotes
    .filter((q) => q.id !== skipId && (q.status === "Sent" || q.status === "Accepted") && q.expires >= TODAY)
    .flatMap((q) => q.lines)
    .filter((l) => l.sku === sku && overlap(l.start, l.end, start, end))
    .reduce((n, l) => n + l.qty * ((cat.uom[l.uomIdx] || [0, 1])[1]), 0);

  if (!cat.ser) {
    const pool = bulk.find((b) => b.sku === sku);
    return { total: pool.total, held, free: Math.max(0, pool.avail - held), nextFree: null, unit: cat.uom[0][0] };
  }
  const units = assets.filter((a) => a.sku === sku);
  const blocked = units.filter((a) => a.status === "In service" || (a.due && overlap(a.start || TODAY, a.due, start, end)));
  const free = Math.max(0, units.length - blocked.length - held);
  const returns = blocked.filter((a) => a.due).map((a) => a.due).sort((x, y) => x - y);
  return { total: units.length, held, free, nextFree: free === 0 && returns.length ? returns[0] : null, unit: "Each" };
}

/* Price waterfall — every step stored, so a disputed price can be reconstructed. */
function priceLine(line, custId) {
  const cat = CATALOG.find((c) => c.sku === line.sku);
  const uom = cat.uom[line.uomIdx] || cat.uom[0];
  const baseQty = line.qty * uom[1];
  const days = spanDays(line.start, line.end);
  const lad = ladder(cat.rates, days);
  const list = lad.cost * baseQty;
  const straight = cat.rates.day ? cat.rates.day * days * baseQty : null;
  const custDisc = termsFor(custId).disc || 0;
  const volDisc = baseQty >= 50 ? 5 : baseQty >= 20 ? 3 : 0;
  const lineDisc = line.disc || 0;
  const totalDisc = Math.min(45, custDisc + volDisc + lineDisc);
  const net = list * (1 - totalDisc / 100);
  const perMonth = baseQty ? net / (days / 28) / baseQty : 0;
  const floor = ((cat.cost - cat.salv) / cat.life) * cfg.floorMultiple;
  return { cat, uom, baseQty, days, lad, list, straight, custDisc, volDisc, lineDisc, totalDisc, net, perMonth, floor, under: perMonth < floor };
}

function quoteTotals(q) {
  const priced = q.lines.map((l) => ({ l, p: priceLine(l, q.cust) }));
  const rental = priced.reduce((s, x) => s + x.p.net, 0);
  const list = priced.reduce((s, x) => s + x.p.list, 0);
  const site = siteRec(q.site);
  const city = site.county ? site.county + " Co." : (CUSTOMERS.find((c) => c.id === q.cust) || {}).city;
  const waiver = q.waiver ? (rental * cfg.waiver) / 100 : 0;
  const freight = q.delivery ? (site.zone || 200) * 2 : 0;
  const enviro = (rental * cfg.enviro) / 100;
  const taxable = rental + waiver + freight + enviro;
  const rate = cfg.tax + (COUNTY_SURTAX[site.county] != null ? COUNTY_SURTAX[site.county] : 1);
  const tax = (taxable * rate) / 100;
  const total = taxable + tax;
  const maxDisc = priced.length ? Math.max(...priced.map((x) => x.p.totalDisc)) : 0;
  const hold = termsFor(q.cust).credit === "hold";
  return {
    priced, rental, list, waiver, freight, enviro, taxable, rate, tax, total, city,
    deposit: (total * cfg.deposit) / 100, maxDisc, hold,
    under: priced.some((x) => x.p.under),
    approval: maxDisc > cfg.approvalAt || hold,
    saved: priced.reduce((s, x) => s + (x.p.straight ? x.p.straight - x.p.list : 0), 0),
  };
}

/* Committed value of an open rental, priced the same way the quote was. */
function contractValue(a) {
  if (!a.start || !a.due) return { total: 0, rem: 0 };
  const days = spanDays(a.start, a.due);
  const left = Math.max(0, Math.round((a.due - TODAY) / DAY));
  return { total: ladder(a.rates, days).cost, rem: left ? ladder(a.rates, left).cost : 0 };
}

/* The views were written against the prototype's shapes. Rather than touch
   every call site, the API rows are mapped back onto those shapes here. */
function shapePool(p) {
  const cat = CATALOG.find((c) => c.sku === p.sku) || {};
  return {
    id: p.sku, sku: p.sku, name: cat.name, cat: cat.cat, bulk: true,
    cost: Number(p.unit_cost), life: p.useful_life_months, salv: Number(p.salvage_value),
    inSvc: p.inSvc, rates: cat.rates || {}, uom: cat.uom || [["Each", 1]],
    total: p.qty_total, onRent: p.qty_on_rent, svc: p.qty_service, avail: p.qty_available,
    ltdRev: Number(p.ltd_revenue), bin: p.yard_bin,
  };
}
function shapeQuote(q) {
  const site = SITES.find((s) => s.id === q.jobsiteId);
  return { ...q, site: q.site || (site ? site.name : "") };
}
function shapeAssetRow(a) {
  const cat = CATALOG.find((c) => c.sku === a.sku) || {};
  return { ...a, name: cat.name, cat: cat.cat, rates: cat.rates || {}, uom: cat.uom || [["Each", 1]] };
}

const Q_PILL = {
  Draft: "p-grey", Sent: "p-out", Accepted: "p-go", Loading: "p-due", Dispatched: "p-svc",
  "On rent": "p-out", Returned: "p-go", Converted: "p-svc", Lost: "p-stop", Expired: "p-due",
};


/* ---------------- depreciation (straight-line, monthly) ---------------- */
function depreciate(item, units = 1) {
  const cost = item.cost * units;
  const salv = item.salv * units;
  const perMo = (cost - salv) / item.life;
  const elapsed = Math.max(0, Math.min(item.life, monthsBetween(item.inSvc, TODAY)));
  const accum = perMo * elapsed;
  return { cost, salv, perMo, elapsed, accum, nbv: cost - accum, pct: elapsed / item.life };
}

/* ---------------- status helpers ---------------- */
function dueState(a) {
  if (!a.due) return null;
  const d = Math.round((a.due - TODAY) / DAY);
  if (d < 0) return { k: "over", d, label: Math.abs(d) + "d over" };
  if (d <= 3) return { k: "soon", d, label: "due " + d + "d" };
  return { k: "ok", d, label: "due " + d + "d" };
}
function statusPill(a) {
  if (a.status === "Available") return ["p-go", "Available"];
  if (a.status === "In service") return ["p-svc", "In service"];
  if (a.status === "In transit") return ["p-grey", "In transit"];
  const ds = dueState(a);
  if (ds && ds.k === "over") return ["p-stop", "Overdue"];
  if (ds && ds.k === "soon") return ["p-due", "Due soon"];
  return ["p-out", "On rent"];
}

/* ---------------- QR-style plate art ----------------
   Placeholder matrix generated from the tag string. Printed tags
   encode https://cls.<domain>/a/<tag> via a real QR encoder. */
function QRArt({ seed, size = 84, fg = "#fff", bg = "#1A2630" }) {
  const n = 21;
  const cells = useMemo(() => {
    const r = mulberry32(hash(seed));
    const g = Array.from({ length: n }, () => Array.from({ length: n }, () => r() > 0.52));
    const finder = (ox, oy) => {
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
        const edge = x === 0 || y === 0 || x === 6 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        g[oy + y][ox + x] = edge || core;
      }
      for (let y = -1; y < 8; y++) for (let x = -1; x < 8; x++) {
        const yy = oy + y, xx = ox + x;
        if (yy >= 0 && yy < n && xx >= 0 && xx < n && (x === -1 || y === -1 || x === 7 || y === 7)) g[yy][xx] = false;
      }
    };
    finder(0, 0); finder(14, 0); finder(0, 14);
    return g;
  }, [seed]);
  const s = size / n;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" aria-hidden="true">
      <rect width={n} height={n} fill={bg} />
      {cells.map((row, y) => row.map((on, x) => on ? <rect key={x + "-" + y} x={x} y={y} width={1} height={1} fill={fg} /> : null))}
    </svg>
  );
}

const BAND = { "Available": "#0D7355", "On rent": "#1B4C7A", "In service": "#6A4E9C", "In transit": "#6A776F", "Overdue": "#A32A1C" };

function Plate({ a, size = 84, lg = false }) {
  const [, label] = statusPill(a);
  return (
    <div className={"plate" + (lg ? " lg" : "")}>
      <div className="ptag">{a.tag}</div>
      <div className="pname">{a.sku} · {a.cat.toUpperCase()}</div>
      <div className="qr"><QRArt seed={a.tag} size={size} /></div>
      <div className="band" style={{ background: BAND[label] || "#6A776F" }} />
    </div>
  );
}

/* ============================================================ */
export default function App() {
  const [view, setView] = useState("dashboard");
  const { data, status, error, saving, lastSaved, actions } = useStore();
  if (data) hydrate(data);
  const assets = data ? data.assets.map(shapeAssetRow) : [];
  const bulk = data ? data.pools.map(shapePool) : [];
  const quotes = data ? data.quotes.map(shapeQuote) : [];
  const [log, setLog] = useState([
    { t: "07:12", act: "OUT", tag: "FL-4821", who: "R. Alvarez", note: "Water Street Tower 3" },
    { t: "07:44", act: "IN", tag: "FL-2065", who: "R. Alvarez", note: "wash + fuel" },
    { t: "08:30", act: "OUT", tag: "FL-7712", who: "D. Nguyen", note: "Riverwalk Hotel Ph 2" },
  ]);
  const [sel, setSel] = useState(null);
  const [queue, setQueue] = useState(4);
  const [doc, setDoc] = useState(null);
  const [sheet, setSheet] = useState(null);   // printable packing list or tag sheet

  const push = (act, tag, note) => {
    const t = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    setLog((l) => [...l, { t, act, tag, who: "M. Reyes", note }].slice(-40));
    setQueue((q) => q + (act === "IN" ? 1 : 0));
  };

  const counts = useMemo(() => {
    const c = { onrent: 0, avail: 0, svc: 0, transit: 0, over: 0, soon: 0 };
    assets.forEach((a) => {
      if (a.status === "Available") c.avail++;
      else if (a.status === "In service") c.svc++;
      else if (a.status === "In transit") c.transit++;
      else c.onrent++;
      const ds = dueState(a);
      if (a.status === "On rent" && ds) { if (ds.k === "over") c.over++; else if (ds.k === "soon") c.soon++; }
    });
    return c;
  }, [assets]);

  const NAV = [
    ["dashboard", "Dashboard", Boxes, null],
    ["scan", "Scan bay", ScanLine, null],
    ["fleet", "Fleet", Layers, assets.length + bulk.length],
    ["quotes", "Quotes", ClipboardList, quotes.filter((q) => q.status === "Draft" || q.status === "Sent").length],
    ["contractors", "Contractors", Building2, CUSTOMERS.length],
    ["onrent", "On rent", Truck, counts.onrent],
    ["reports", "Reports", BarChart3, null],
    ["qbo", "QuickBooks", RefreshCw, queue],
    ["access", "Access", ShieldCheck, null],
  ];
  const TITLES = {
    dashboard: ["Dashboard", "Where every asset stands right now"],
    scan: ["Scan bay", "Tag in, tag out — one field, no menus"],
    fleet: ["Fleet", "Serialized assets and bulk stock"],
    quotes: ["Quote desk", "Price it, hold it, send it"],
    contractors: ["Contractors", "Who you rent to, and where it goes"],
    onrent: ["On rent", "Open contracts by contractor and jobsite"],
    reports: ["Reports", "Utilization, depreciation, revenue"],
    qbo: ["QuickBooks Online", "What syncs, what's waiting"],
    access: ["Access", "Who's been invited, and what they can do"],
  };

  if (status === "loading") {
    return (
      <div className="ld boot">
        <style>{CSS}</style>
        <div className="bootbox">
          <div className="mark">CONTRACTOR LEASING <em>SOLUTIONS</em></div>
          <div className="mono">Loading the yard\u2026</div>
        </div>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="ld boot">
        <style>{CSS}</style>
        <div className="bootbox">
          <div className="mark">CONTRACTOR LEASING <em>SOLUTIONS</em></div>
          <div className="mono err">{error ? error.message : "Something went wrong."}</div>
          <div className="mono dim">
            {error && error.status === 401
              ? "Your session expired."
              : "The database may be waking up. Azure SQL takes about a minute after an idle pause."}
          </div>
          <button className="btn sig" onClick={() => actions.refresh()}>
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ld">
      <style>{CSS}</style>
      {error && (
        <div className="toast">
          <AlertTriangle size={15} />
          <span>{error.message}</span>
          <button onClick={actions.dismissError} aria-label="Dismiss"><X size={13} /></button>
        </div>
      )}
      <nav className="rail">
        <div className="brand">
          <div className="mark">
            <span className="full">CONTRACTOR<br />LEASING<br /><em>SOLUTIONS</em></span>
            <span className="abbr">CLS</span>
          </div>
          <div className="sub">Rental asset control</div>
        </div>
        <div className="navlist">
          {NAV.map(([k, label, Icon, cnt]) => (
            <button key={k} className={"navbtn" + (view === k ? " on" : "")} onClick={() => setView(k)}>
              <Icon size={15} strokeWidth={2} /><span>{label}</span>
              {cnt != null && <span className="cnt">{cnt}</span>}
            </button>
          ))}
        </div>
        <div className="railfoot">
          <b>Tampa yard</b><br />{data.user.upn}<br />{(data.user.roles.find((r) => r !== "anonymous" && r !== "authenticated") || "no role")}
          <div className={"savelamp" + (saving ? " on" : "")}>
            {saving ? "Saving\u2026" : lastSaved ? "Saved " + lastSaved.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "Up to date"}
          </div>
        </div>
      </nav>

      <main className="main">
        <div className="topbar">
          <h1>{TITLES[view][0]}</h1>
          <div className="desc">{TITLES[view][1]}</div>
          <div className="clock">{TODAY.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div>
        </div>
        <div className="wrap">
          {view === "dashboard" && <Dashboard assets={assets} bulk={bulk} quotes={quotes} counts={counts} onPick={setSel} go={setView} />}
          {view === "scan" && <ScanBay assets={assets} bulk={bulk} quotes={quotes} actions={actions}
            log={log} push={push} onPick={setSel} setSheet={setSheet} />}
          {view === "fleet" && <Fleet assets={assets} bulk={bulk} actions={actions} onPick={setSel} />}
          {view === "quotes" && <Quotes quotes={quotes} assets={assets} bulk={bulk} actions={actions}
            setDoc={setDoc} onPost={() => setQueue((n) => n + 1)} />}
          {view === "contractors" && <Contractors assets={assets} quotes={quotes} actions={actions} />}
          {view === "onrent" && <OnRent assets={assets} onPick={setSel} />}
          {view === "reports" && <Reports assets={assets} bulk={bulk} />}
          {view === "qbo" && <QBO queue={queue} setQueue={setQueue} assets={assets} />}
          {view === "access" && <Access />}
        </div>
      </main>

      {sel && <><div className="scrim" onClick={() => setSel(null)} /><Detail item={sel} close={() => setSel(null)} setSheet={setSheet} /></>}
      {doc && <QuoteDoc q={quotes.find((x) => x.id === doc)} close={() => setDoc(null)} />}
      {sheet && sheet.kind === "packing" &&
        <PackingDoc q={quotes.find((x) => x.id === sheet.qid) || null} site={sheet.site} cust={sheet.cust}
          tags={sheet.tags} mode={sheet.mode} assets={assets} close={() => setSheet(null)} />}
      {sheet && sheet.kind === "tags" &&
        <TagSheet tags={sheet.tags} assets={assets} close={() => setSheet(null)} />}
    </div>
  );
}

/* ---------------- DASHBOARD ---------------- */
function Dashboard({ assets, bulk, quotes, counts, onPick, go }) {
  const fleetVal = useMemo(() => {
    let cost = 0, nbv = 0, rev = 0;
    assets.forEach((a) => { const d = depreciate(a); cost += d.cost; nbv += d.nbv; rev += a.ltdRev; });
    bulk.forEach((b) => { const d = depreciate(b, b.total); cost += d.cost; nbv += d.nbv; rev += b.ltdRev; });
    return { cost, nbv, rev };
  }, [assets, bulk]);

  const timeUtil = counts.onrent / (counts.onrent + counts.avail + counts.transit);
  const onRentOEC = assets.filter((a) => a.status === "On rent").reduce((s, a) => s + a.cost, 0);
  const dollarUtil = onRentOEC / assets.reduce((s, a) => s + a.cost, 0);

  const trend = useMemo(() => {
    const r = mulberry32(7);
    const out = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1);
      const base = 74000 + (11 - i) * 2600;
      out.push({
        m: d.toLocaleDateString("en-US", { month: "short" }),
        rental: Math.round(base * (0.88 + r() * 0.26)),
        dep: Math.round(fleetVal.cost / 84),
        util: Math.round((52 + r() * 22)),
      });
    }
    return out;
  }, [fleetVal.cost]);

  const attention = assets
    .filter((a) => a.status === "On rent" && dueState(a).k !== "ok")
    .sort((a, b) => a.due - b.due).slice(0, 7);

  const openQuotes = useMemo(() => quotes.filter((x) => x.status === "Draft" || x.status === "Sent"), [quotes]);
  const quoteValue = useMemo(() => openQuotes.reduce((s, x) => s + quoteTotals(x).total, 0), [openQuotes]);
  const book = useMemo(() => assets.filter((a) => a.status === "On rent")
    .reduce((s, a) => { const v = contractValue(a); return { total: s.total + v.total, rem: s.rem + v.rem }; }, { total: 0, rem: 0 }), [assets]);

  const quoteSites = useMemo(() => {
    const m = {};
    openQuotes.forEach((x) => {
      const k = x.site;
      m[k] = m[k] || { site: k, cust: x.cust, n: 0, value: 0, soonest: null };
      m[k].n++; m[k].value += quoteTotals(x).total;
      if (x.status === "Sent" && (!m[k].soonest || x.expires < m[k].soonest)) m[k].soonest = x.expires;
    });
    return Object.values(m).sort((a, b) => b.value - a.value);
  }, [openQuotes]);

  const contractSites = useMemo(() => {
    const m = {};
    assets.filter((a) => a.status === "On rent").forEach((a) => {
      const k = a.site;
      m[k] = m[k] || { site: k, cust: a.cust, units: 0, total: 0, rem: 0, next: null, late: 0 };
      const v = contractValue(a);
      m[k].units++; m[k].total += v.total; m[k].rem += v.rem;
      if (!m[k].next || a.due < m[k].next) m[k].next = a.due;
      if (dueState(a).k === "over") m[k].late++;
    });
    return Object.values(m).sort((a, b) => b.total - a.total);
  }, [assets]);

  const byCat = useMemo(() => {
    const m = {};
    assets.forEach((a) => {
      m[a.cat] = m[a.cat] || { cat: a.cat, on: 0, tot: 0 };
      m[a.cat].tot++; if (a.status === "On rent") m[a.cat].on++;
    });
    bulk.forEach((b) => {
      m[b.cat] = m[b.cat] || { cat: b.cat, on: 0, tot: 0 };
      m[b.cat].tot += b.total; m[b.cat].on += b.onRent;
    });
    return Object.values(m).map((x) => ({ ...x, util: Math.round((x.on / x.tot) * 100) }));
  }, [assets, bulk]);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="grid g4">
        <div className="stat accent">
          <div className="k">Time utilization</div>
          <div className="v">{Math.round(timeUtil * 100)}<small>%</small></div>
          <div className="f">{counts.onrent} of {counts.onrent + counts.avail + counts.transit} serialized units working</div>
        </div>
        <div className="stat">
          <div className="k">Dollar utilization</div>
          <div className="v">{Math.round(dollarUtil * 100)}<small>%</small></div>
          <div className="f">{money(onRentOEC)} of original cost deployed</div>
        </div>
        <div className="stat">
          <div className="k">Net book value</div>
          <div className="v">{money(fleetVal.nbv / 1000)}<small>k</small></div>
          <div className="f">{money(fleetVal.cost / 1000)}k original cost, straight-line</div>
        </div>
        <div className="stat">
          <div className="k">Needs a call</div>
          <div className="v" style={{ color: counts.over ? "var(--stop)" : "inherit" }}>{counts.over + counts.soon}</div>
          <div className="f">{counts.over} past due · {counts.soon} due within 3 days</div>
        </div>
      </div>

      <div className="grid g4">
        <div className="stat accent">
          <div className="k">Open quotes</div>
          <div className="v">{openQuotes.length}</div>
          <div className="f">{openQuotes.filter((x) => x.status === "Sent").length} out for signature · {openQuotes.filter((x) => x.status === "Draft").length} in draft</div>
        </div>
        <div className="stat">
          <div className="k">Quoted value</div>
          <div className="v">{money(quoteValue / 1000)}<small>k</small></div>
          <div className="f">holding inventory it hasn't earned yet</div>
        </div>
        <div className="stat">
          <div className="k">Contract value on the ground</div>
          <div className="v">{money(book.total / 1000)}<small>k</small></div>
          <div className="f">full term of every open rental</div>
        </div>
        <div className="stat">
          <div className="k">Still to bill</div>
          <div className="v">{money(book.rem / 1000)}<small>k</small></div>
          <div className="f">{Math.round((book.rem / (book.total || 1)) * 100)}% of committed value remains</div>
        </div>
      </div>

      <div className="panel">
        <div className="phead"><h3>Where the fleet is</h3><div className="note">serialized units</div></div>
        <div style={{ padding: 14 }}>
          <div className="split">
            {[["On rent", counts.onrent, "#1B4C7A"], ["Available", counts.avail, "#0D7355"], ["In transit", counts.transit, "#6A776F"], ["In service", counts.svc, "#6A4E9C"]]
              .map(([l, v, c]) => (
                <div key={l} style={{ background: c, flex: v || 0.001 }}>{v >= 3 ? v : ""}</div>
              ))}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
            {[["On rent", counts.onrent, "#1B4C7A"], ["Available", counts.avail, "#0D7355"], ["In transit", counts.transit, "#6A776F"], ["In service", counts.svc, "#6A4E9C"]]
              .map(([l, v, c]) => (
                <div key={l} className="mono" style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
                  <i style={{ width: 9, height: 9, background: c, display: "block" }} />{l} — {v}
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        <div className="panel">
          <div className="phead"><h3>Rental revenue vs depreciation</h3><div className="note">trailing 12 months</div></div>
          <div style={{ padding: "14px 8px 6px", height: 268 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#DDE1DA" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 10, fontFamily: "IBM Plex Mono", fill: "#6A776F" }} axisLine={{ stroke: "#CBD1C9" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fontFamily: "IBM Plex Mono", fill: "#6A776F" }} axisLine={false} tickLine={false} tickFormatter={(v) => "$" + v / 1000 + "k"} />
                <Tooltip formatter={(v, n) => [money(v), n === "rental" ? "Rental revenue" : "Book depreciation"]}
                  contentStyle={{ fontFamily: "IBM Plex Mono", fontSize: 11, border: "1px solid #CBD1C9", borderRadius: 0 }} />
                <Bar dataKey="rental" fill="#1A2630" maxBarSize={26} />
                <Line type="monotone" dataKey="dep" stroke="#EF5A0C" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="phead"><h3>Utilization by category</h3></div>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 13 }}>
            {byCat.map((c) => (
              <div key={c.cat}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontFamily: "var(--display)", fontSize: 16, textTransform: "uppercase", letterSpacing: ".05em" }}>{c.cat}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{c.util}% · {c.on}/{c.tot}</span>
                </div>
                <div className="bar"><i style={{ width: c.util + "%" }} /></div>
              </div>
            ))}
            <div className="notice" style={{ marginTop: 2 }}>
              Fence panels and chairs move as bundles, so their utilization counts base units, not bundles.
            </div>
          </div>
        </div>
      </div>

      <div className="grid g2">
        <div className="panel">
          <div className="phead">
            <h3>Open quotes by jobsite</h3>
            <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={() => go("quotes")}>Quote desk <ChevronRight size={13} /></button>
          </div>
          {quoteSites.length === 0
            ? <div style={{ padding: 22, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Nothing open.</div>
            : (
              <table className="tbl">
                <thead><tr><th>Jobsite</th><th>Contractor</th><th className="num">Quotes</th><th className="num">Value</th><th>Expires</th></tr></thead>
                <tbody>
                  {quoteSites.map((r) => {
                    const left = r.soonest ? Math.round((r.soonest - TODAY) / DAY) : null;
                    return (
                      <tr key={r.site}>
                        <td style={{ fontWeight: 500 }}>{r.site}</td>
                        <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{custName(r.cust)}</td>
                        <td className="num">{r.n}</td>
                        <td className="num" style={{ fontWeight: 500 }}>{money(r.value)}</td>
                        <td>{left == null
                          ? <span className="pill p-grey">Draft</span>
                          : <span className={"pill " + (left <= 5 ? "p-due" : "p-out")}>{left}d</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
        </div>

        <div className="panel">
          <div className="phead">
            <h3>Active contract value by jobsite</h3>
            <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={() => go("onrent")}>Contracts <ChevronRight size={13} /></button>
          </div>
          <table className="tbl">
            <thead><tr><th>Jobsite</th><th className="num">Units</th><th className="num">Contract value</th><th className="num">Still to bill</th><th>Next return</th></tr></thead>
            <tbody>
              {contractSites.map((r) => (
                <tr key={r.site}>
                  <td style={{ fontWeight: 500 }}>{r.site}
                    <div style={{ color: "var(--muted)", fontSize: 11.5 }}>{custName(r.cust)}</div></td>
                  <td className="num">{r.units}</td>
                  <td className="num">{money(r.total)}</td>
                  <td className="num" style={{ fontWeight: 500 }}>{money(r.rem)}</td>
                  <td className="mono" style={{ fontSize: 11.5, color: r.late ? "var(--stop)" : "var(--muted)" }}>
                    {fmtD(r.next)}{r.late ? " · " + r.late + " late" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="phead">
          <h3>Returns to chase</h3>
          <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={() => go("onrent")}>All contracts <ChevronRight size={13} /></button>
        </div>
        <table className="tbl">
          <thead><tr><th>Tag</th><th>Asset</th><th>Contractor</th><th>Jobsite</th><th>Term</th><th>Due</th><th>Status</th><th className="num">Day rate</th></tr></thead>
          <tbody>
            {attention.map((a) => {
              const ds = dueState(a), [cls, label] = statusPill(a);
              return (
                <tr key={a.id} className="click" onClick={() => onPick(a)}>
                  <td className="mono" style={{ fontWeight: 500 }}>{a.tag}</td>
                  <td>{a.name}</td>
                  <td>{custName(a.cust)}</td>
                  <td style={{ color: "var(--muted)" }}>{a.site}</td>
                  <td className="mono" style={{ fontSize: 12, textTransform: "capitalize" }}>{a.term}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{fmtD(a.due)}</td>
                  <td><span className={"pill " + cls}>{ds.label}</span></td>
                  <td className="num">{a.rates.day ? money(a.rates.day) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- SCAN BAY ----------------
   Check-out = equipment leaving our yard for a jobsite.
   Check-in  = equipment coming back from a jobsite.
   Out is driven by an accepted order; in is driven by the project the
   equipment is standing on, because that is what the driver is looking at. */
function ScanBay({ assets, bulk, quotes, actions, log, push, onPick, setSheet }) {
  const [mode, setMode] = useState("out");
  const [target, setTarget] = useState(null);
  const [val, setVal] = useState("");
  const [found, setFound] = useState(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [session, setSession] = useState([]);
  const [counted, setCounted] = useState({});
  const [site, setSite] = useState(SITES[0].name);
  const [term, setTerm] = useState("week");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, [mode, target]);
  const reset = () => { setSession([]); setCounted({}); setFound(null); setErr(""); setNote(""); };

  /* OUT: accepted orders waiting to be loaded */
  const loadable = quotes.filter((x) => x.status === "Accepted" || x.status === "Loading");

  /* IN: open projects — any jobsite holding equipment right now, whether it
     went out through an order or was checked out ad hoc years ago. */
  const projects = useMemo(() => {
    const m = {};
    assets.filter((a) => (a.status === "On rent" || a.status === "In transit") && a.site).forEach((a) => {
      m[a.site] = m[a.site] || { site: a.site, cust: a.cust, units: [], next: null, late: 0 };
      m[a.site].units.push(a);
      if (a.due && (!m[a.site].next || a.due < m[a.site].next)) m[a.site].next = a.due;
      if (a.due && dueState(a).k === "over") m[a.site].late++;
    });
    return Object.values(m).sort((x, y) => (x.next || 0) - (y.next || 0));
  }, [assets]);

  const order = mode === "out" ? loadable.find((x) => x.id === target) || null : null;
  const project = mode === "in" ? projects.find((p) => p.site === target) || null : null;
  const active = order || project;

  /* an order still open against this project, so pooled lines can be reconciled */
  const linked = project
    ? quotes.find((x) => x.site === project.site && x.packed.length > x.returned.length) || null
    : null;

  /* OUT: expected comes from the order's lines */
  const expectedOut = useMemo(() => {
    if (!order) return [];
    return order.lines.map((l) => {
      const cat = CATALOG.find((c) => c.sku === l.sku);
      const uom = cat.uom[l.uomIdx] || cat.uom[0];
      return {
        key: l.id, l, cat, uom, need: l.qty * uom[1], serialized: cat.ser,
        label: l.qty + " " + uom[0].toLowerCase() + (l.qty > 1 ? "s" : "") + (uom[1] > 1 ? " (" + l.qty * uom[1] + ")" : ""),
        scanned: session.filter((t) => (assets.find((a) => a.tag === t) || {}).sku === l.sku).length,
      };
    });
  }, [order, session, assets]);

  /* IN: expected is simply what is standing on the site */
  const expectedIn = useMemo(() => {
    if (!project) return [];
    const m = {};
    project.units.forEach((a) => {
      m[a.sku] = m[a.sku] || { key: a.sku, sku: a.sku, cat: { name: a.name }, need: 0, scanned: 0, serialized: true, label: "" };
      m[a.sku].need++;
    });
    session.forEach((t) => {
      const a = assets.find((x) => x.tag === t);
      if (a && m[a.sku]) m[a.sku].scanned++;
    });
    Object.values(m).forEach((r) => { r.label = r.need + " on site"; });
    const bulkRows = linked ? linked.lines.filter((l) => {
      const cat = CATALOG.find((c) => c.sku === l.sku);
      return cat && !cat.ser;
    }).map((l) => {
      const cat = CATALOG.find((c) => c.sku === l.sku);
      const uom = cat.uom[l.uomIdx] || cat.uom[0];
      return { key: "b" + l.id, l, cat, uom, need: l.qty * uom[1], serialized: false, scanned: 0,
        label: l.qty + " " + uom[0].toLowerCase() + (l.qty > 1 ? "s" : "") };
    }) : [];
    return [...Object.values(m), ...bulkRows];
  }, [project, session, assets, linked]);

  const expected = mode === "out" ? expectedOut : expectedIn;
  const serialDone = expected.filter((e) => e.serialized).every((e) => e.scanned >= e.need);
  const bulkDone = expected.filter((e) => !e.serialized).every((e) => counted[e.key]);
  /* a load must be complete before it dispatches; a return can be partial,
     because equipment comes back a truck at a time */
  const ready = mode === "out" ? !!(order && session.length && serialDone && bulkDone) : !!(project && session.length);

  const lookup = (raw) => {
    const tag = (raw || val).trim().toUpperCase();
    setVal("");
    if (!tag) return;
    const a = assets.find((x) => x.tag === tag || x.id.toUpperCase() === tag);
    if (!a) { setErr("No asset carries tag " + tag + "."); setNote(""); return; }
    setErr("");

    if (!active) { setFound(a); setTerm(a.term || (a.rates.day ? "day" : "month")); return; }
    if (session.includes(a.tag)) { setNote(a.tag + " is already on this list."); return; }

    if (mode === "out") {
      const line = order.lines.find((l) => l.sku === a.sku);
      if (!line) { setNote(a.tag + " (" + a.name + ") is not on " + order.id + ". Add it to the order first, or scan it out ad hoc."); return; }
      if (a.status !== "Available") { setNote(a.tag + " reads as " + a.status.toLowerCase() + ". Clear it before loading."); return; }
      const cat = CATALOG.find((c) => c.sku === a.sku);
      const need = line.qty * ((cat.uom[line.uomIdx] || cat.uom[0])[1]);
      const already = session.filter((t) => (assets.find((x) => x.tag === t) || {}).sku === a.sku).length;
      if (already >= need) { setNote(order.id + " calls for " + need + " × " + a.sku + " and that many are already loaded."); return; }
    } else {
      if (a.status === "Available") { setNote(a.tag + " is already in the yard."); return; }
      if (a.site !== project.site) { setNote(a.tag + " is out at " + a.site + ", not " + project.site + ". Switch projects or receive it ad hoc."); return; }
    }
    setNote("");
    setSession((sx) => [...sx, a.tag]);
  };

  const [busy, setBusy] = useState(false);

  /* The server re-checks completeness and unit status inside one
     transaction. Half a load dispatched is worse than none. */
  const confirmLoad = async () => {
    setBusy(true);
    try {
      await actions.checkOut({ quoteId: order.id, tags: session });
      session.forEach((t) => push("OUT", t, order.id + " \u00b7 " + order.site));
      reset();
    } catch (e) {
      setNote(e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmReturn = async () => {
    setBusy(true);
    try {
      await actions.checkIn({ jobsiteId: siteRec(project.site).id, tags: session });
      session.forEach((t) => push("IN", t, project.site + " \u00b7 returned"));
      reset();
    } catch (e) {
      setNote(e.message);
    } finally {
      setBusy(false);
    }
  };

  /* Ad-hoc moves still go through the same stored procedures, so they get
     the same movement rows and the same audit trail as an order. */
  const adhoc = async (kind, toService) => {
    if (!found) return;
    setBusy(true);
    try {
      if (kind === "out") {
        await actions.checkOut({ jobsiteId: siteRec(site).id, tags: [found.tag], adhoc: true, term });
        push("OUT", found.tag, site);
      } else {
        await actions.checkIn({ jobsiteId: siteRec(found.site).id, tags: [found.tag], toService: !!toService });
        push("IN", found.tag, toService ? "into service" : "returned to " + found.bin);
      }
      setFound(null);
      inputRef.current?.focus();
    } catch (e) {
      setNote(e.message);
    } finally {
      setBusy(false);
    }
  };

  const samples = useMemo(() => {
    if (order) {
      return order.lines.map((l) => assets.find((a) => a.sku === l.sku && a.status === "Available" && !session.includes(a.tag)))
        .filter(Boolean).slice(0, 4);
    }
    if (project) return project.units.filter((a) => !session.includes(a.tag)).slice(0, 4);
    const avail = assets.find((a) => a.status === "Available");
    const over = assets.find((a) => a.status === "On rent" && dueState(a).k === "over");
    return (mode === "out" ? [avail, over] : [over, assets.find((a) => a.status === "On rent")]).filter(Boolean);
  }, [order, project, assets, session, mode]);

  const ds = found ? dueState(found) : null;
  const fp = found ? statusPill(found) : ["", ""];
  const outstanding = project ? project.units.length - session.length : 0;

  return (
    <div className="bay">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="console">
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div className="modesw">
              <button className={mode === "out" ? "on out" : ""} onClick={() => { setMode("out"); setTarget(null); reset(); }}>
                <ArrowRight size={14} /> Check-out
              </button>
              <button className={mode === "in" ? "on in" : ""} onClick={() => { setMode("in"); setTarget(null); reset(); }}>
                <ArrowLeft size={14} /> Check-in
              </button>
            </div>
            <select className="tsel" value={target || ""} onChange={(e) => { setTarget(e.target.value || null); reset(); }}>
              <option value="">{mode === "out" ? "No order — ad hoc check-out" : "No project — ad hoc return"}</option>
              {mode === "out"
                ? loadable.map((x) => <option key={x.id} value={x.id}>{x.id} · {custName(x.cust)} · {x.site}</option>)
                : projects.map((p) => (
                  <option key={p.site} value={p.site}>
                    {p.site} · {custName(p.cust)} · {p.units.length} out{p.late ? " · " + p.late + " late" : ""}
                  </option>
                ))}
            </select>
          </div>

          <div className="mono" style={{ fontSize: 10, color: "#4E6069", letterSpacing: ".08em", marginTop: 9, lineHeight: 1.6 }}>
            {mode === "out"
              ? "LEAVING THE YARD FOR A JOBSITE — RENTAL TIME STARTS AT THE GATE"
              : "COMING BACK FROM A JOBSITE — RENTAL TIME STOPS AT THE GATE"}
          </div>

          <div className={"lamp" + (active ? " busy" : "")} style={{ marginTop: 12 }}>
            <i />{order ? "Loading " + order.id + " — scan each unit onto the truck"
              : project ? "Receiving from " + project.site + " — " + outstanding + " still out"
                : mode === "out" ? "Ad-hoc check-out — ready for scan" : "Ad-hoc return — ready for scan"}
          </div>

          <div className="scanrow">
            <input ref={inputRef} value={val} placeholder="SCAN OR TYPE TAG" aria-label="Asset tag"
              onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookup()} />
            <button onClick={() => lookup()}><Search size={15} /></button>
          </div>
          <div className="hintrow">
            <span className="mono" style={{ fontSize: 10, color: "#4E6069", alignSelf: "center", letterSpacing: ".1em" }}>NO SCANNER? TRY</span>
            {samples.map((sx) => <button key={sx.tag} onClick={() => lookup(sx.tag)}>{sx.tag}</button>)}
          </div>
          {err && <div className="mono" style={{ marginTop: 13, color: "#EF5A0C", fontSize: 11.5 }}>{err}</div>}
          {note && <div className="mono" style={{ marginTop: 13, color: "#D8C400", fontSize: 11.5, lineHeight: 1.6 }}>{note}</div>}
        </div>

        {active && (
          <div className="panel slide">
            <div className="phead">
              <h3>{mode === "out" ? "Packing list · " + order.id : "On site at " + project.site}</h3>
              <div className="note">
                {mode === "out"
                  ? custName(order.cust) + " · " + order.site
                  : custName(project.cust) + (linked ? " · " + linked.id : " · no linked order")}
              </div>
            </div>
            <table className="tbl">
              <thead><tr><th>Item</th><th className="num">{mode === "out" ? "Ordered" : "Out"}</th><th className="num">{mode === "out" ? "Loaded" : "Received"}</th><th>Progress</th><th>How</th></tr></thead>
              <tbody>
                {expected.map((e) => {
                  const done = e.serialized ? e.scanned >= e.need : !!counted[e.key];
                  const pct = e.serialized ? Math.min(100, (e.scanned / e.need) * 100) : (counted[e.key] ? 100 : 0);
                  return (
                    <tr key={e.key}>
                      <td>
                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{e.cat.name}</div>
                        <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{e.sku || e.l.sku}</div>
                      </td>
                      <td className="num">{e.label}</td>
                      <td className="num" style={{ color: done ? "var(--go)" : "inherit", fontWeight: done ? 600 : 400 }}>
                        {e.serialized ? e.scanned : counted[e.key] ? e.need : 0}
                      </td>
                      <td style={{ width: 110 }}><div className="bar"><i style={{ width: pct + "%", background: done ? "var(--go)" : "var(--signal)" }} /></div></td>
                      <td>
                        {e.serialized
                          ? <span className="pill p-grey">Scanned</span>
                          : <button className={"chip" + (counted[e.key] ? " on" : "")}
                              onClick={() => setCounted((c) => ({ ...c, [e.key]: !c[e.key] }))}>
                              {counted[e.key] ? "Counted" : "Confirm count"}
                            </button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {session.length > 0 && (
              <div style={{ padding: 14, borderTop: "1px solid var(--line-2)" }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  {mode === "out" ? "On the truck" : "Off the truck"} — {session.length} tag{session.length > 1 ? "s" : ""}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {session.map((t) => (
                    <span key={t} className="tagchip">
                      {t}
                      <button onClick={() => setSession((sx) => sx.filter((y) => y !== t))} aria-label={"Remove " + t}><X size={11} /></button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ padding: 14, borderTop: "1px solid var(--line-2)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn sig" disabled={!ready || busy} onClick={mode === "out" ? confirmLoad : confirmReturn}>
                <Check size={15} /> {busy ? "Working\u2026" : mode === "out" ? "Confirm load & dispatch" : "Confirm return"}
              </button>
              <button className="btn ghost" disabled={!session.length}
                onClick={() => setSheet({ kind: "packing", qid: order ? order.id : (linked ? linked.id : null),
                  site: active.site, cust: active.cust, tags: session, mode })}>
                <FileText size={14} /> {mode === "out" ? "Packing list" : "Return receipt"}
              </button>
              <button className="btn ghost" disabled={!session.length}
                onClick={() => setSheet({ kind: "tags", tags: session })}>
                <Printer size={14} /> Print tags
              </button>
              {!ready && <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                {session.length === 0 ? "Scan the first unit to start."
                  : !serialDone ? "Serialized lines are short." : "Confirm the counted lines."}
              </span>}
              {ready && mode === "in" && outstanding > 0 && (
                <span className="mono" style={{ fontSize: 11, color: "var(--hivis)", filter: "brightness(.75)" }}>
                  Partial return — {outstanding} unit{outstanding > 1 ? "s" : ""} stay on site
                </span>
              )}
              {ready && mode === "in" && outstanding === 0 && (
                <span className="mono" style={{ fontSize: 11, color: "var(--go)" }}>Closes the project out</span>
              )}
              {ready && mode === "out" && (
                <span className="mono" style={{ fontSize: 11, color: "var(--go)" }}>Assigns these tags to {order.id}</span>
              )}
            </div>
          </div>
        )}

        {!active && found && (
          <div className="panel slide">
            <div className="phead">
              <h3>{found.name}</h3>
              <span className={"pill " + fp[0]} style={{ marginLeft: 8 }}>{fp[1]}</span>
              <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={() => onPick(found)}>Open record</button>
            </div>
            <div style={{ display: "flex", gap: 16, padding: 14 }}>
              <div style={{ width: 138, flex: "0 0 138px" }}><Plate a={found} size={112} lg /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <dl className="kv">
                  <dt>Yard location</dt><dd>{found.bin}</dd>
                  <dt>Condition</dt><dd>{found.cond}</dd>
                  {found.meter != null && <><dt>Meter</dt><dd>{found.meter.toLocaleString()} hrs</dd></>}
                  {found.site && <><dt>Out at</dt><dd style={{ fontFamily: "var(--body)" }}>{found.site}</dd></>}
                  {found.due && <><dt>Due back</dt><dd style={{ color: ds.k === "over" ? "var(--stop)" : "inherit" }}>{fmtD(found.due)} · {ds.label}</dd></>}
                </dl>

                {mode === "out" && found.status === "Available" && (
                  <div style={{ marginTop: 14, borderTop: "1px solid var(--line-2)", paddingTop: 13 }}>
                    <div className="eyebrow" style={{ marginBottom: 7 }}>Send to</div>
                    <select className="input" value={site} onChange={(e) => setSite(e.target.value)} style={{ width: "100%" }}>
                      {SITES.filter((sx) => sx.active !== false).map((sx) => (
                        <option key={sx.name} value={sx.name}>{sx.name} — {custName(sx.cust)}</option>
                      ))}
                    </select>
                    <div className="chips" style={{ marginTop: 9 }}>
                      {["day", "week", "month"].map((t) => (
                        <button key={t} className={"chip" + (term === t ? " on" : "")} disabled={!found.rates[t]} onClick={() => setTerm(t)}>
                          {t === "month" ? "28-day" : t} · {found.rates[t] ? money(found.rates[t]) : "n/a"}
                        </button>
                      ))}
                    </div>
                    <button className="btn sig" style={{ marginTop: 13 }} onClick={() => adhoc("out")}>
                      <ArrowRight size={15} /> Check out of yard
                    </button>
                  </div>
                )}
                {mode === "out" && found.status !== "Available" && (
                  <div className="notice" style={{ marginTop: 14 }}>
                    <b>Not in the yard to send.</b> This unit reads as {found.status.toLowerCase()}
                    {found.site ? " at " + found.site : ""}. Switch to check-in to receive it.
                  </div>
                )}
                {mode === "in" && found.status !== "Available" && (
                  <div style={{ marginTop: 14, borderTop: "1px solid var(--line-2)", paddingTop: 13, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn" onClick={() => adhoc("in")}><ArrowLeft size={15} /> Receive back to yard</button>
                    <button className="btn ghost" onClick={() => adhoc("in", true)}><Wrench size={14} /> Receive into service</button>
                  </div>
                )}
                {mode === "in" && found.status === "Available" && (
                  <div className="notice" style={{ marginTop: 14 }}>
                    <b>Already in the yard.</b> Nothing to receive on this tag.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="panel">
          <div className="phead"><h3>Today at the gate</h3><div className="note">{log.length} moves</div></div>
          <div className="feed">
            {log.map((l, i) => (
              <div className="row" key={i}>
                <span>{l.t}</span>
                <span className={l.act === "OUT" ? "o" : "i"}>{l.act === "OUT" ? "OUT ▸" : "◂ IN "}</span>
                <b>{l.tag}</b>
                <span style={{ marginLeft: "auto", textAlign: "right", opacity: .85 }}>{l.note}</span>
              </div>
            ))}
          </div>
        </div>

        {!active && mode === "out" && loadable.length > 0 && (
          <div className="panel">
            <div className="phead"><h3>Waiting to load</h3><div className="note">accepted orders</div></div>
            <table className="tbl">
              <tbody>
                {loadable.map((x) => (
                  <tr key={x.id} className="click" onClick={() => { setTarget(x.id); reset(); }}>
                    <td className="mono" style={{ fontWeight: 500, width: 66 }}>{x.id}</td>
                    <td style={{ fontSize: 12.5 }}>{custName(x.cust)}<div style={{ color: "var(--muted)", fontSize: 11.5 }}>{x.site}</div></td>
                    <td className="num mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>{x.lines.length} lines</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!active && mode === "in" && (
          <div className="panel">
            <div className="phead"><h3>Open projects</h3><div className="note">{projects.length} sites holding equipment</div></div>
            <div style={{ maxHeight: 330, overflow: "auto" }}>
              <table className="tbl">
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.site} className="click" onClick={() => { setTarget(p.site); reset(); }}>
                      <td style={{ fontSize: 12.5, fontWeight: 500 }}>{p.site}
                        <div style={{ color: "var(--muted)", fontSize: 11.5, fontWeight: 400 }}>{custName(p.cust)}</div></td>
                      <td className="num mono" style={{ fontSize: 11.5 }}>{p.units.length} out</td>
                      <td className="num mono" style={{ fontSize: 11, color: p.late ? "var(--stop)" : "var(--muted)" }}>
                        {p.next ? fmtD(p.next) : "—"}{p.late ? " · " + p.late + " late" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="notice">
          {mode === "out"
            ? <><b>Check-out is the gate, not the jobsite.</b> Rental time starts when the unit leaves the yard, and nothing
              is assigned to an order until the load is confirmed — the order can't dispatch while a line is short.
              That's also where serial numbers finally bind to the contract.</>
            : <><b>Check-in is the gate too.</b> Rental time stops when the unit is back in the yard, not when the
              superintendent called it off rent. Returns can be partial, so a project stays open until the last tag is
              scanned — which is what keeps a forgotten light tower from quietly leaving the books.</>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- FLEET ---------------- */
const nextTag = (assets) => {
  const max = assets.reduce((m, a) => {
    const n = parseInt((a.tag || "").split("-")[1], 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 1000);
  return "FL-" + (max + 1);
};

function Fleet({ assets, bulk, actions, onPick }) {
  const [tab, setTab] = useState("assets");
  const [cat, setCat] = useState("All");
  const [st, setSt] = useState("All");
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);   // {kind:'asset'|'bulk'|'model', item?}

  const cats = ["All", ...new Set(CATALOG.map((c) => c.cat))];
  const states = ["All", "Available", "On rent", "In service", "In transit"];

  const rows = useMemo(() => {
    const ser = assets.filter((a) =>
      (cat === "All" || a.cat === cat) && (st === "All" || a.status === st) &&
      (!q || (a.name + a.tag + a.sku + (a.site || "")).toLowerCase().includes(q.toLowerCase())));
    const blk = st === "All" || st === "Available"
      ? bulk.filter((b) => (cat === "All" || b.cat === cat) && (!q || (b.name + b.sku).toLowerCase().includes(q.toLowerCase())))
      : [];
    const mod = CATALOG.filter((c) => (cat === "All" || c.cat === cat) &&
      (!q || (c.name + c.sku + c.desc).toLowerCase().includes(q.toLowerCase())));
    return { ser, blk, mod };
  }, [assets, bulk, cat, st, q]);

  /* One save path for the model record, so name, description, rates and the
     unit ladder stay in step with the units already on the yard. */
  /* One save path for the model record. The rate card and unit ladder live
     on the product, so every unit already on the yard picks the change up on
     the next read — no fan-out update to write. */
  const saveModel = async (rec, isNew) => {
    await actions.saveProduct(isNew ? null : rec.sku, rec);
    setForm(null);
  };

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="panel" style={{ padding: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div className="chips">
          <button className={"chip" + (tab === "assets" ? " on" : "")} onClick={() => setTab("assets")}>Assets</button>
          <button className={"chip" + (tab === "models" ? " on" : "")} onClick={() => setTab("models")}>Models &amp; SKUs</button>
        </div>
        <input className="input" placeholder="Search tag, model, SKU" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 200 }} />
        <div className="chips">{cats.map((c) => <button key={c} className={"chip" + (cat === c ? " on" : "")} onClick={() => setCat(c)}>{c}</button>)}</div>
        {tab === "assets" && (
          <div className="chips" style={{ marginLeft: "auto" }}>
            {states.map((sx) => <button key={sx} className={"chip" + (st === sx ? " on" : "")} onClick={() => setSt(sx)}>{sx}</button>)}
          </div>
        )}
      </div>

      {tab === "models" ? (
        <div className="panel">
          <div className="phead">
            <h3>Models &amp; SKUs</h3>
            <div className="note">{rows.mod.length} models · rate card and unit ladder live here</div>
            <button className="btn sig sm" style={{ marginLeft: 12 }} onClick={() => setForm({ kind: "model" })}>
              <Plus size={13} /> Add model
            </button>
          </div>
          <table className="tbl">
            <thead><tr><th>SKU</th><th>Model</th><th>Category</th><th>Tracking</th><th>Unit ladder</th><th className="num">Day</th><th className="num">Week</th><th className="num">28-day</th><th className="num">In fleet</th><th></th></tr></thead>
            <tbody>
              {rows.mod.map((c) => {
                const held = c.ser ? assets.filter((a) => a.sku === c.sku).length
                  : (bulk.find((b) => b.sku === c.sku) || {}).total || 0;
                return (
                  <tr key={c.sku}>
                    <td className="mono" style={{ fontWeight: 500 }}>{c.sku}</td>
                    <td style={{ minWidth: 190 }}>
                      {c.name}
                      {c.desc && <div style={{ color: "var(--muted)", fontSize: 11.5, lineHeight: 1.45, marginTop: 2 }}>{c.desc}</div>}
                    </td>
                    <td style={{ color: "var(--muted)" }}>{c.cat}</td>
                    <td><span className={"pill " + (c.ser ? "p-out" : "p-grey")}>{c.ser ? "Serialized" : "Pooled"}</span></td>
                    <td className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{c.uom.map((u) => u[0] + (u[1] > 1 ? "×" + u[1] : "")).join(" › ")}</td>
                    <td className="num">{c.rates.day ? money(c.rates.day) : "—"}</td>
                    <td className="num">{c.rates.week ? money(c.rates.week) : "—"}</td>
                    <td className="num">{c.rates.month ? money(c.rates.month) : "—"}</td>
                    <td className="num">{held || "—"}</td>
                    <td style={{ textAlign: "right", width: 44 }}>
                      <button className="btn ghost sm" onClick={() => setForm({ kind: "model", item: c })} aria-label={"Edit " + c.sku}>
                        <Pencil size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="notice" style={{ margin: 14 }}>
            Editing a model here updates every unit already on the yard — name, category, rate card, and unit ladder.
            It does not touch acquisition cost or in-service date on units already received, because those are
            depreciation facts about a specific purchase, not properties of the model.
          </div>
        </div>
      ) : (
        <>
          <div className="panel">
            <div className="phead">
              <h3>Serialized assets</h3>
              <div className="note">{rows.ser.length} units · one QR tag each</div>
              <button className="btn sig sm" style={{ marginLeft: 12 }} onClick={() => setForm({ kind: "asset" })}>
                <Plus size={13} /> Receive units
              </button>
            </div>
            <div style={{ maxHeight: 470, overflow: "auto" }}>
              <table className="tbl">
                <thead><tr><th>Tag</th><th>Model</th><th>Category</th><th>Status</th><th>Location</th><th className="num">Cost</th><th className="num">Book value</th><th className="num">LTD revenue</th><th className="num">ROI</th><th></th></tr></thead>
                <tbody>
                  {rows.ser.map((a) => {
                    const d = depreciate(a), sp = statusPill(a);
                    return (
                      <tr key={a.id} className="click" tabIndex={0} onClick={() => onPick(a)} onKeyDown={(e) => e.key === "Enter" && onPick(a)}>
                        <td className="mono" style={{ fontWeight: 500 }}>{a.tag}</td>
                        <td>{a.name}</td>
                        <td style={{ color: "var(--muted)" }}>{a.cat}</td>
                        <td><span className={"pill " + sp[0]}>{sp[1]}</span></td>
                        <td style={{ color: "var(--muted)", fontSize: 12 }}>{a.site || a.bin}</td>
                        <td className="num">{money(d.cost)}</td>
                        <td className="num">{money(d.nbv)}</td>
                        <td className="num">{money(a.ltdRev)}</td>
                        <td className="num" style={{ color: a.ltdRev / d.cost > 1 ? "var(--go)" : "inherit" }}>{Math.round((a.ltdRev / d.cost) * 100)}%</td>
                        <td style={{ textAlign: "right", width: 44 }}>
                          <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setForm({ kind: "asset", item: a }); }} aria-label={"Edit " + a.tag}>
                            <Pencil size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="phead">
              <h3>Bulk stock</h3>
              <div className="note">tracked by count, tagged by bundle</div>
              <button className="btn sig sm" style={{ marginLeft: 12 }} onClick={() => setForm({ kind: "bulk" })}>
                <Plus size={13} /> Receive stock
              </button>
            </div>
            {rows.blk.length === 0 ? (
              <div style={{ padding: 22, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No pooled stock matches this filter.</div>
            ) : (
              <table className="tbl">
                <thead><tr><th>SKU</th><th>Item</th><th>Unit ladder</th><th className="num">On hand</th><th className="num">On rent</th><th className="num">Available</th><th>Fill</th><th className="num">Book value</th><th></th></tr></thead>
                <tbody>
                  {rows.blk.map((b) => {
                    const d = depreciate(b, b.total);
                    const pct = Math.round((b.onRent / b.total) * 100);
                    return (
                      <tr key={b.id} className="click" tabIndex={0} onClick={() => onPick(b)} onKeyDown={(e) => e.key === "Enter" && onPick(b)}>
                        <td className="mono" style={{ fontWeight: 500 }}>{b.sku}</td>
                        <td>{b.name}</td>
                        <td className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{b.uom.map((u) => u[0] + (u[1] > 1 ? "×" + u[1] : "")).join(" › ")}</td>
                        <td className="num">{b.total}</td>
                        <td className="num">{b.onRent}</td>
                        <td className="num" style={{ color: b.avail < b.total * 0.15 ? "var(--stop)" : "inherit" }}>{b.avail}</td>
                        <td style={{ width: 100 }}><div className="bar"><i style={{ width: pct + "%" }} /></div></td>
                        <td className="num">{money(d.nbv)}</td>
                        <td style={{ textAlign: "right", width: 44 }}>
                          <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setForm({ kind: "bulk", item: b }); }} aria-label={"Edit " + b.sku}>
                            <Pencil size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {form && form.kind === "asset" &&
        <AssetForm item={form.item} assets={assets} actions={actions} saveModel={saveModel} close={() => setForm(null)} />}
      {form && form.kind === "bulk" &&
        <BulkForm item={form.item} bulk={bulk} actions={actions} close={() => setForm(null)} />}
      {form && form.kind === "model" &&
        <ModelForm item={form.item} save={saveModel} close={() => setForm(null)} />}
    </div>
  );
}

function ModelForm({ item, save, close }) {
  const editing = !!item;
  const [f, setF] = useState(item ? {
    sku: item.sku, name: item.name, desc: item.desc || "", cat: item.cat, ser: item.ser,
    meter: !!item.meter, cost: item.cost, life: item.life, salv: item.salv,
    day: item.rates.day || 0, week: item.rates.week || 0, month: item.rates.month || 0,
    uom: [...item.uom, ["", 0], ["", 0]].slice(0, 3),
  } : {
    sku: "", name: "", desc: "", cat: "Equipment", ser: true, meter: false,
    cost: 5000, life: 60, salv: 500, day: 0, week: 0, month: 0,
    uom: [["Each", 1], ["", 0], ["", 0]],
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setUom = (i, j, v) => setF((x) => {
    const u = x.uom.map((row) => [...row]);
    u[i][j] = j === 1 ? (+v || 0) : v;
    return { ...x, uom: u };
  });

  const ladderOut = f.uom.filter((u, i) => i === 0 || (u[0].trim() && u[1] > 1)).map((u, i) => [u[0].trim() || "Each", i === 0 ? 1 : u[1]]);
  const skuTaken = !editing && CATALOG.some((c) => c.sku.toUpperCase() === f.sku.trim().toUpperCase());
  const valid = f.name.trim() && f.sku.trim() && !skuTaken && (f.day || f.week || f.month);

  const commit = () => save({
    sku: f.sku.trim().toUpperCase(), name: f.name.trim(), desc: f.desc.trim(), cat: f.cat, ser: f.ser,
    cost: +f.cost, life: +f.life, salv: +f.salv, meter: f.ser && f.meter,
    rates: { day: +f.day, week: +f.week, month: +f.month },
    uom: ladderOut, qty: editing ? item.qty : 0,
  }, !editing);

  return (
    <div className="mwrap" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mhead">
          <h3>{editing ? "Edit model " + item.sku : "Add model"}</h3>
          <button className="dclose" style={{ marginLeft: "auto" }} onClick={close} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="mbody">
          <Field label="SKU" hint={skuTaken ? "That SKU already exists." : editing ? "Fixed once units exist." : "Short code, e.g. SCL-1930."}>
            <input className="input" value={f.sku} disabled={editing} onChange={(e) => set("sku", e.target.value)} />
          </Field>
          <Field label="Category">
            <select className="input" value={f.cat} onChange={(e) => set("cat", e.target.value)}>
              {["Equipment", "Structures", "Furnishings", "Technology"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Model name" full>
            <input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="What it says on the rate sheet" />
          </Field>
          <Field label="Description" full hint="Appears on quotes and packing lists. Specs a superintendent would want before signing.">
            <textarea className="input" rows={3} value={f.desc} onChange={(e) => set("desc", e.target.value)} style={{ resize: "vertical", fontFamily: "var(--body)" }} />
          </Field>
          <Field label="Tracking" hint={f.ser ? "One tag and one depreciation schedule per unit." : "Counted pool; tag the bundle, not the piece."}>
            <select className="input" value={f.ser ? "1" : "0"} disabled={editing} onChange={(e) => set("ser", e.target.value === "1")}>
              <option value="1">Serialized</option>
              <option value="0">Pooled / bulk</option>
            </select>
          </Field>
          {f.ser && (
            <Field label="Has an hour meter" hint="Powered equipment. Enables meter capture at scan.">
              <select className="input" value={f.meter ? "1" : "0"} onChange={(e) => set("meter", e.target.value === "1")}>
                <option value="0">No</option><option value="1">Yes</option>
              </select>
            </Field>
          )}
          <Field label="Default cost"><input className="input" type="number" value={f.cost} onChange={(e) => set("cost", e.target.value)} /></Field>
          <Field label="Useful life (months)"><input className="input" type="number" value={f.life} onChange={(e) => set("life", e.target.value)} /></Field>
          <Field label="Salvage value"><input className="input" type="number" value={f.salv} onChange={(e) => set("salv", e.target.value)} /></Field>

          <div className="full" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Rate card — leave a term at 0 to not offer it</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 11 }}>
              <Field label="Daily"><input className="input" type="number" value={f.day} onChange={(e) => set("day", e.target.value)} /></Field>
              <Field label="Weekly (7 days)"><input className="input" type="number" value={f.week} onChange={(e) => set("week", e.target.value)} /></Field>
              <Field label="28-day"><input className="input" type="number" value={f.month} onChange={(e) => set("month", e.target.value)} /></Field>
            </div>
          </div>

          <div className="full" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Unit ladder — base unit first, then how it's bundled</div>
            {f.uom.map((u, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "24px 1fr 120px", gap: 9, alignItems: "center", marginBottom: 7 }}>
                <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{i + 1}</span>
                <input className="input" value={u[0]} placeholder={i === 0 ? "Each / Panel" : "Bundle / Pallet (optional)"} onChange={(e) => setUom(i, 0, e.target.value)} />
                <input className="input" type="number" min={i === 0 ? 1 : 0} value={i === 0 ? 1 : u[1]} disabled={i === 0}
                  onChange={(e) => setUom(i, 1, e.target.value)} placeholder="base units" />
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6 }}>
              Reads as <b className="mono">{ladderOut.map((u) => u[0] + (u[1] > 1 ? "×" + u[1] : "")).join(" › ")}</b>.
              Rates above are per base unit. Stock always moves in base units, whatever level you quote at.
            </div>
          </div>

          <div className="full notice">
            Monthly book depreciation at these defaults is <b>{money2(((+f.cost - +f.salv) / (+f.life || 1)) || 0)}</b> per unit.
            A 28-day rate under about <b>{money(((+f.cost - +f.salv) / (+f.life || 1)) * 1.8)}</b> won't clear the rate floor.
          </div>
        </div>
        <div className="mfoot">
          <button className="btn ghost sm" onClick={close}>Cancel</button>
          <button className="btn sig sm" disabled={!valid} onClick={commit}>
            <Check size={13} /> {editing ? "Save model" : "Add model"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children, full }) {
  return (
    <div className={"field" + (full ? " full" : "")}>
      <label>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

function AssetForm({ item, assets, actions, saveModel, close }) {
  const editing = !!item;
  const [sku, setSku] = useState(editing ? item.sku : "SCL-1930");
  const cat = CATALOG.find((c) => c.sku === sku) || CATALOG[0];
  const [f, setF] = useState(editing ? {
    tag: item.tag, status: item.status, cond: item.cond, bin: item.bin,
    meter: item.meter == null ? "" : item.meter, cost: item.cost, inSvc: iso(item.inSvc),
    life: item.life, salv: item.salv,
  } : {
    tag: "", status: "Available", cond: "Good", bin: "Row A-1", meter: "",
    cost: cat.cost, inSvc: iso(TODAY), life: cat.life, salv: cat.salv,
  });
  const [count, setCount] = useState(1);
  const [model, setModel] = useState({ name: cat.name, desc: cat.desc || "" });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const modelDirty = editing && (model.name !== cat.name || model.desc !== (cat.desc || ""));

  const pickSku = (v) => {
    const c = CATALOG.find((x) => x.sku === v);
    setSku(v);
    if (!editing) setF((x) => ({ ...x, cost: c.cost, life: c.life, salv: c.salv, meter: c.meter ? 0 : "" }));
  };

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      if (modelDirty) {
        await saveModel({ ...cat, name: model.name.trim() || cat.name, desc: model.desc.trim() }, false);
      }
      if (editing) {
        await actions.saveAsset(item.id, {
          tag: f.tag.trim().toUpperCase() || item.tag, status: f.status, cond: f.cond, bin: f.bin,
          meter: f.meter === "" ? null : Number(f.meter), cost: Number(f.cost),
          life: Number(f.life), salv: Number(f.salv), inSvc: f.inSvc,
        });
      } else {
        /* Tags are minted server-side inside the transaction — two people
           receiving at once must not both be handed FL-1234. */
        await actions.receiveAssets({
          sku, count, cost: Number(f.cost), life: Number(f.life), salv: Number(f.salv),
          inSvc: f.inSvc, cond: f.cond, bin: f.bin,
        });
      }
      close();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const serialCats = CATALOG.filter((c) => c.ser);

  return (
    <div className="mwrap" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mhead">
          <h3>{editing ? "Edit " + item.tag : "Receive serialized units"}</h3>
          <button className="dclose" style={{ marginLeft: "auto" }} onClick={close} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="mbody">
          {!editing && (
            <>
              <Field label="Model" full>
                <select className="input" value={sku} onChange={(e) => pickSku(e.target.value)}>
                  {serialCats.map((c) => <option key={c.sku} value={c.sku}>{c.sku} — {c.name}</option>)}
                </select>
              </Field>
              <Field label="How many" hint="Each unit gets its own tag and depreciation schedule.">
                <input className="input" type="number" min="1" max="25" value={count} onChange={(e) => setCount(Math.max(1, Math.min(25, +e.target.value || 1)))} />
              </Field>
              <Field label="Tags" hint="Assigned by the server on save, then print the labels before these leave the dock.">
                <div className="mono" style={{ fontSize: 12.5, paddingTop: 7, color: "var(--muted)" }}>
                  next after {nextTag(assets)}
                </div>
              </Field>
            </>
          )}
          {editing && (
            <>
              <Field label="Asset tag" hint="Changing this reprints the label; history follows the asset, not the tag.">
                <input className="input" value={f.tag} onChange={(e) => set("tag", e.target.value)} />
              </Field>
              <Field label="Status" hint={item.status === "On rent" ? "Returning it here also clears the jobsite." : ""}>
                <select className="input" value={f.status} onChange={(e) => set("status", e.target.value)}>
                  {["Available", "In service", "In transit"].map((sx) => <option key={sx}>{sx}</option>)}
                  {item.status === "On rent" && <option value="On rent">On rent</option>}
                </select>
              </Field>
            </>
          )}
          <Field label="Condition">
            <select className="input" value={f.cond} onChange={(e) => set("cond", e.target.value)}>
              {["Good", "Fair", "Damage hold"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Yard slot">
            <input className="input" value={f.bin} onChange={(e) => set("bin", e.target.value)} />
          </Field>
          <Field label="Acquisition cost">
            <input className="input" type="number" value={f.cost} onChange={(e) => set("cost", e.target.value)} />
          </Field>
          <Field label="In service">
            <input className="input" type="date" value={f.inSvc} onChange={(e) => set("inSvc", e.target.value)} />
          </Field>
          <Field label="Useful life (months)" hint="Book basis. Tax life is a separate schedule.">
            <input className="input" type="number" value={f.life} onChange={(e) => set("life", e.target.value)} />
          </Field>
          <Field label="Salvage value">
            <input className="input" type="number" value={f.salv} onChange={(e) => set("salv", e.target.value)} />
          </Field>
          {editing && item.meter != null && (
            <Field label="Meter hours" full>
              <input className="input" type="number" value={f.meter} onChange={(e) => set("meter", e.target.value)} />
            </Field>
          )}
          {editing && (
            <div className="full" style={{ borderTop: "1px solid var(--line)", paddingTop: 12, display: "grid", gap: 11 }}>
              <div className="eyebrow">Model record — {cat.sku}</div>
              <Field label="Model name">
                <input className="input" value={model.name} onChange={(e) => setModel((m) => ({ ...m, name: e.target.value }))} />
              </Field>
              <Field label="Model description" hint="Appears on quotes and packing lists.">
                <textarea className="input" rows={3} value={model.desc}
                  onChange={(e) => setModel((m) => ({ ...m, desc: e.target.value }))}
                  style={{ resize: "vertical", fontFamily: "var(--body)" }} />
              </Field>
              {modelDirty && (
                <div className="warn" style={{ padding: "9px 11px" }}>
                  <b>Applies to the whole model</b>
                  Saving updates every {cat.sku} unit on the yard, not just {item.tag}. Rate card and unit ladder are
                  edited under Models &amp; SKUs.
                </div>
              )}
            </div>
          )}
          <div className="full notice" style={{ marginTop: 2 }}>
            Monthly book depreciation on these terms is{" "}
            <b>{money2(((+f.cost - +f.salv) / (+f.life || 1)) || 0)}</b> per unit.
            Nothing here posts to QuickBooks until the asset is received against a bill.
          </div>
        </div>
        <div className="mfoot">
          {err && <div className="mono" style={{ color: "var(--stop)", fontSize: 11.5, marginRight: "auto" }}>{err}</div>}
          <button className="btn ghost sm" onClick={close}>Cancel</button>
          <button className="btn sig sm" disabled={busy} onClick={save}>
            <Check size={13} /> {busy ? "Saving\u2026" : editing ? "Save changes" : "Receive " + count + " unit" + (count > 1 ? "s" : "")}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkForm({ item, bulk, actions, close }) {
  const editing = !!item;
  const bulkCats = CATALOG.filter((c) => !c.ser);
  const [sku, setSku] = useState(editing ? item.sku : (bulkCats[0] || {}).sku);
  const cat = CATALOG.find((c) => c.sku === sku) || bulkCats[0];
  const existing = bulk.find((b) => b.sku === sku);
  const [f, setF] = useState(editing ? {
    add: 0, cost: item.cost, life: item.life, salv: item.salv, inSvc: iso(item.inSvc), bin: item.bin, svc: item.svc,
  } : {
    add: 24, cost: cat.cost, life: cat.life, salv: cat.salv, inSvc: iso(TODAY), bin: "Yard A", svc: 0,
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const pickSku = (v) => {
    const c = CATALOG.find((x) => x.sku === v);
    setSku(v);
    setF((x) => ({ ...x, cost: c.cost, life: c.life, salv: c.salv }));
  };

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      await actions.saveStock({
        sku, add: Number(f.add) || 0, svc: editing ? Number(f.svc) : null,
        cost: Number(f.cost), life: Number(f.life), salv: Number(f.salv),
        inSvc: f.inSvc, bin: f.bin,
      });
      close();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const unit = (cat.uom[0] || ["Each"])[0].toLowerCase();

  return (
    <div className="mwrap" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mhead">
          <h3>{editing ? "Edit " + item.sku : "Receive bulk stock"}</h3>
          <button className="dclose" style={{ marginLeft: "auto" }} onClick={close} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="mbody">
          {!editing && (
            <Field label="Item" full hint={existing ? "A pool already exists — this adds to it." : "This creates a new pool."}>
              <select className="input" value={sku} onChange={(e) => pickSku(e.target.value)}>
                {bulkCats.map((c) => <option key={c.sku} value={c.sku}>{c.sku} — {c.name}</option>)}
              </select>
            </Field>
          )}
          <Field label={editing ? "Add to pool" : "Quantity received"} hint={"Counted in " + unit + "s, the base unit."}>
            <input className="input" type="number" min="0" value={f.add} onChange={(e) => set("add", e.target.value)} />
          </Field>
          <Field label="Unit ladder" hint="Set on the catalog record, not here.">
            <div className="mono" style={{ fontSize: 12, paddingTop: 8 }}>
              {cat.uom.map((u) => u[0] + (u[1] > 1 ? "×" + u[1] : "")).join(" › ")}
            </div>
          </Field>
          <Field label={"Cost per " + unit}>
            <input className="input" type="number" value={f.cost} onChange={(e) => set("cost", e.target.value)} />
          </Field>
          <Field label="In service">
            <input className="input" type="date" value={f.inSvc} onChange={(e) => set("inSvc", e.target.value)} />
          </Field>
          <Field label="Useful life (months)">
            <input className="input" type="number" value={f.life} onChange={(e) => set("life", e.target.value)} />
          </Field>
          <Field label={"Salvage per " + unit}>
            <input className="input" type="number" value={f.salv} onChange={(e) => set("salv", e.target.value)} />
          </Field>
          <Field label="Yard location">
            <input className="input" value={f.bin} onChange={(e) => set("bin", e.target.value)} />
          </Field>
          {editing && (
            <Field label="Held for repair" hint="Units out of the rentable pool.">
              <input className="input" type="number" min="0" value={f.svc} onChange={(e) => set("svc", e.target.value)} />
            </Field>
          )}
          <div className="full notice" style={{ marginTop: 2 }}>
            {editing
              ? "Pool will hold " + (item.total + (+f.add || 0)) + " " + unit + "s at " + money(+f.cost) + " each."
              : (existing ? "Adds " + (+f.add || 0) + " to the existing " + existing.total + " " + unit + "s." : "Creates a pool of " + (+f.add || 0) + " " + unit + "s.")}
            {" "}Tag the bundle, not the piece — nobody scans 240 fence panels.
          </div>
        </div>
        <div className="mfoot">
          {err && <div className="mono" style={{ color: "var(--stop)", fontSize: 11.5, marginRight: "auto" }}>{err}</div>}
          <button className="btn ghost sm" onClick={close}>Cancel</button>
          <button className="btn sig sm" disabled={busy} onClick={save}>
            <Check size={13} /> {busy ? "Saving\u2026" : editing ? "Save changes" : "Receive stock"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- ON RENT ---------------- */
function OnRent({ assets, onPick }) {
  const groups = useMemo(() => {
    const m = {};
    assets.filter((a) => a.status === "On rent" || a.status === "In transit").forEach((a) => {
      const key = a.cust + "|" + a.site;
      m[key] = m[key] || { cust: a.cust, site: a.site, items: [] };
      m[key].items.push(a);
    });
    return Object.values(m).sort((a, b) => b.items.length - a.items.length);
  }, [assets]);

  const periodRate = (a) => a.term === "day" ? a.rates.day : a.term === "week" ? a.rates.week : a.rates.month;
  const monthlyEquiv = (a) => a.term === "day" ? a.rates.day * 20 : a.term === "week" ? a.rates.week * 4 : a.rates.month;

  return (
    <div className="grid" style={{ gap: 14 }}>
      {groups.map((g) => {
        const c = CUSTOMERS.find((x) => x.id === g.cust) || {};
        const run = g.items.reduce((s, a) => s + monthlyEquiv(a), 0);
        const late = g.items.filter((a) => a.due && dueState(a).k === "over").length;
        return (
          <div className="panel" key={g.cust + g.site}>
            <div className="phead" style={{ alignItems: "flex-start" }}>
              <Building2 size={17} style={{ marginTop: 2, color: "var(--muted)" }} />
              <div>
                <h3>{c.name}</h3>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", letterSpacing: ".07em", marginTop: 3 }}>
                  {g.site.toUpperCase()} · {c.terms.toUpperCase()} · {c.qbo || "NOT LINKED TO QBO"}
                </div>
              </div>
              <div className="note" style={{ textAlign: "right" }}>
                {money(run)} / 28-day run rate<br />{g.items.length} lines{late ? " · " + late + " overdue" : ""}
              </div>
            </div>
            <table className="tbl">
              <thead><tr><th>Tag</th><th>Item</th><th>Out since</th><th>Term</th><th className="num">Rate</th><th>Due back</th><th className="num">Billed to date</th></tr></thead>
              <tbody>
                {g.items.map((a) => {
                  const ds = a.due ? dueState(a) : null;
                  const daysOut = a.start ? Math.max(1, Math.round((TODAY - a.start) / DAY)) : 0;
                  const billed = a.term === "day" ? a.rates.day * daysOut
                    : a.term === "week" ? a.rates.week * Math.ceil(daysOut / 7)
                      : a.rates.month * Math.ceil(daysOut / 28);
                  return (
                    <tr key={a.id} className="click" onClick={() => onPick(a)}>
                      <td className="mono" style={{ fontWeight: 500 }}>{a.tag}</td>
                      <td>{a.name}</td>
                      <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{a.start ? fmtD(a.start) : "—"} <span style={{ opacity: .7 }}>({daysOut}d)</span></td>
                      <td className="mono" style={{ fontSize: 12, textTransform: "capitalize" }}>{a.term === "month" ? "28-day" : a.term}</td>
                      <td className="num">{money(periodRate(a))}</td>
                      <td>{ds ? <span className={"pill " + (ds.k === "over" ? "p-stop" : ds.k === "soon" ? "p-due" : "p-grey")}>{fmtD(a.due)}</span> : <span className="pill p-grey">Open ended</span>}</td>
                      <td className="num">{money(billed)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- REPORTS ---------------- */
function Reports({ assets, bulk }) {
  const [tab, setTab] = useState("dep");
  const [csv, setCsv] = useState(false);

  const depRows = useMemo(() => {
    const ser = assets.map((a) => ({ ...depreciate(a), tag: a.tag, name: a.name, cat: a.cat, inSvc: a.inSvc, life: a.life, rev: a.ltdRev, units: 1 }));
    const blk = bulk.map((b) => ({ ...depreciate(b, b.total), tag: b.sku, name: b.name + " (×" + b.total + ")", cat: b.cat, inSvc: b.inSvc, life: b.life, rev: b.ltdRev, units: b.total }));
    return [...ser, ...blk].sort((a, b) => b.cost - a.cost);
  }, [assets, bulk]);

  const totals = depRows.reduce((s, r) => ({ cost: s.cost + r.cost, accum: s.accum + r.accum, nbv: s.nbv + r.nbv, mo: s.mo + r.perMo, rev: s.rev + r.rev }), { cost: 0, accum: 0, nbv: 0, mo: 0, rev: 0 });

  const skuPerf = useMemo(() => {
    const m = {};
    assets.forEach((a) => {
      m[a.sku] = m[a.sku] || { sku: a.sku, name: a.name, units: 0, on: 0, cost: 0, rev: 0 };
      m[a.sku].units++; m[a.sku].cost += a.cost; m[a.sku].rev += a.ltdRev;
      if (a.status === "On rent") m[a.sku].on++;
    });
    return Object.values(m).map((x) => ({ ...x, util: Math.round((x.on / x.units) * 100), roi: Math.round((x.rev / x.cost) * 100) }))
      .sort((a, b) => b.roi - a.roi);
  }, [assets]);

  const byCust = useMemo(() => {
    const m = {};
    assets.filter((a) => a.status === "On rent").forEach((a) => {
      const mo = a.term === "day" ? a.rates.day * 20 : a.term === "week" ? a.rates.week * 4 : a.rates.month;
      m[a.cust] = m[a.cust] || { cust: custName(a.cust), units: 0, run: 0 };
      m[a.cust].units++; m[a.cust].run += mo;
    });
    return Object.values(m).sort((a, b) => b.run - a.run);
  }, [assets]);

  const idle = useMemo(() => skuPerf.filter((s) => s.util < 34).sort((a, b) => a.roi - b.roi), [skuPerf]);

  const csvText = useMemo(() =>
    ["tag,item,category,in_service,life_months,original_cost,monthly_depreciation,accumulated,net_book_value,ltd_revenue",
      ...depRows.map((r) => [r.tag, '"' + r.name + '"', r.cat, r.inSvc.toISOString().slice(0, 10), r.life,
      r.cost.toFixed(2), r.perMo.toFixed(2), r.accum.toFixed(2), r.nbv.toFixed(2), r.rev.toFixed(2)].join(","))].join("\n"),
    [depRows]);

  const TABS = [["dep", "Depreciation register"], ["perf", "Utilization & ROI"], ["cust", "Revenue by contractor"], ["idle", "Idle capital"]];

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="grid g4">
        <div className="stat"><div className="k">Original cost</div><div className="v">{money(totals.cost / 1000)}<small>k</small></div><div className="f">{depRows.length} depreciating lines</div></div>
        <div className="stat"><div className="k">Accumulated dep.</div><div className="v">{money(totals.accum / 1000)}<small>k</small></div><div className="f">{Math.round((totals.accum / totals.cost) * 100)}% of cost recognized</div></div>
        <div className="stat"><div className="k">Monthly dep. expense</div><div className="v">{money(totals.mo / 1000)}<small>k</small></div><div className="f">posts to QBO as one journal entry</div></div>
        <div className="stat accent"><div className="k">Lifetime revenue / cost</div><div className="v">{Math.round((totals.rev / totals.cost) * 100)}<small>%</small></div><div className="f">fleet has returned {money(totals.rev / 1000)}k</div></div>
      </div>

      <div className="panel" style={{ padding: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div className="chips">{TABS.map(([k, l]) => <button key={k} className={"chip" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>{l}</button>)}</div>
        {tab === "dep" && <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={() => setCsv(!csv)}><FileText size={13} /> {csv ? "Hide" : "Show"} CSV</button>}
      </div>

      {csv && tab === "dep" && <pre className="csv">{csvText}</pre>}

      {tab === "dep" && (
        <div className="panel">
          <div className="phead"><h3>Depreciation register</h3><div className="note">straight-line · book basis</div></div>
          <div style={{ maxHeight: 500, overflow: "auto" }}>
            <table className="tbl">
              <thead><tr><th>Tag</th><th>Item</th><th>In service</th><th className="num">Life</th><th className="num">Cost</th><th className="num">Per month</th><th className="num">Accumulated</th><th className="num">Book value</th><th>Life used</th></tr></thead>
              <tbody>
                {depRows.map((r) => (
                  <tr key={r.tag + r.name}>
                    <td className="mono" style={{ fontWeight: 500 }}>{r.tag}</td>
                    <td>{r.name}</td>
                    <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{fmtD(r.inSvc)}</td>
                    <td className="num">{r.life}mo</td>
                    <td className="num">{money(r.cost)}</td>
                    <td className="num">{money2(r.perMo)}</td>
                    <td className="num">{money(r.accum)}</td>
                    <td className="num" style={{ fontWeight: 500 }}>{money(r.nbv)}</td>
                    <td style={{ width: 90 }}><div className="bar"><i style={{ width: Math.min(100, r.pct * 100) + "%", background: r.pct > 0.85 ? "var(--stop)" : "var(--signal)" }} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "perf" && (
        <div className="panel">
          <div className="phead"><h3>Utilization and return by model</h3></div>
          <div style={{ padding: "14px 8px 4px", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skuPerf} margin={{ top: 4, right: 12, left: 0, bottom: 40 }}>
                <CartesianGrid stroke="#DDE1DA" vertical={false} />
                <XAxis dataKey="sku" tick={{ fontSize: 9.5, fontFamily: "IBM Plex Mono", fill: "#6A776F" }} angle={-45} textAnchor="end" interval={0} axisLine={{ stroke: "#CBD1C9" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fontFamily: "IBM Plex Mono", fill: "#6A776F" }} axisLine={false} tickLine={false} tickFormatter={(v) => v + "%"} />
                <Tooltip contentStyle={{ fontFamily: "IBM Plex Mono", fontSize: 11, border: "1px solid #CBD1C9", borderRadius: 0 }} />
                <Legend wrapperStyle={{ fontFamily: "IBM Plex Mono", fontSize: 10.5 }} />
                <Bar dataKey="util" name="Utilization %" fill="#1A2630" maxBarSize={20} />
                <Bar dataKey="roi" name="Lifetime revenue % of cost" fill="#EF5A0C" maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === "cust" && (
        <div className="panel">
          <div className="phead"><h3>Open run rate by contractor</h3><div className="note">28-day equivalent</div></div>
          <table className="tbl">
            <thead><tr><th>Contractor</th><th className="num">Units out</th><th className="num">28-day run rate</th><th>Share</th></tr></thead>
            <tbody>
              {byCust.map((c) => {
                const max = byCust[0].run;
                return (
                  <tr key={c.cust}>
                    <td>{c.cust}</td>
                    <td className="num">{c.units}</td>
                    <td className="num" style={{ fontWeight: 500 }}>{money(c.run)}</td>
                    <td style={{ width: 200 }}><div className="bar"><i style={{ width: (c.run / max) * 100 + "%" }} /></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "idle" && (
        <div className="panel">
          <div className="phead"><h3>Capital not earning</h3><div className="note">under 34% utilization</div></div>
          <table className="tbl">
            <thead><tr><th>SKU</th><th>Model</th><th className="num">Units</th><th className="num">On rent</th><th className="num">Utilization</th><th className="num">Capital tied up</th><th className="num">Lifetime return</th></tr></thead>
            <tbody>
              {idle.map((s) => (
                <tr key={s.sku}>
                  <td className="mono" style={{ fontWeight: 500 }}>{s.sku}</td>
                  <td>{s.name}</td>
                  <td className="num">{s.units}</td>
                  <td className="num">{s.on}</td>
                  <td className="num" style={{ color: "var(--stop)" }}>{s.util}%</td>
                  <td className="num">{money(s.cost)}</td>
                  <td className="num">{s.roi}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="notice" style={{ margin: 14 }}>
            These models sit in the yard more than they work. Either the rate is wrong, the mix is wrong,
            or the units belong at a different jobsite. Sell-off candidates show a lifetime return above 100% with low utilization.
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- QBO ---------------- */
function QBO({ queue, setQueue, assets }) {
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(0);

  const pending = useMemo(() => {
    const out = assets.filter((a) => a.status === "On rent").slice(0, 6).map((a, i) => ({
      id: "INV-" + (4820 + i), type: "Invoice", cust: CUSTOMERS.find((c) => c.id === a.cust)?.name,
      memo: a.tag + " " + a.name, amt: a.term === "week" ? a.rates.week : a.term === "day" ? a.rates.day * 5 : a.rates.month,
    }));
    out.push({ id: "JE-0806", type: "Journal entry", cust: "—", memo: "August book depreciation, all classes", amt: 41870 });
    return out.slice(0, Math.max(1, queue));
  }, [assets, queue]);

  const run = () => {
    setPosting(true);
    setTimeout(() => { setPosting(false); setPosted(pending.length); setQueue(0); }, 1100);
  };

  const MAP = [
    ["Contractor", "Customer", "One QBO customer per GC; jobsites map to sub-customers so job costing stays clean"],
    ["Quote", "Estimate", "Pushed when sent, not when drafted; links downstream to the invoices raised from it"],
    ["Rental line", "Invoice line, service item", "One service item per SKU and term — e.g. Scissor Lift 19ft / 28-day"],
    ["Delivery & pickup", "Invoice line, service item", "Flat or mileage; taxed separately from the rental"],
    ["Damage waiver", "Invoice line, service item", "Percentage of rental subtotal, its own income account"],
    ["Deposit", "Payment applied to customer", "Held as a liability until the contract closes"],
    ["Asset purchase", "Fixed asset account", "Created in QBO when a unit is received, tag written back to CLS"],
    ["Monthly depreciation", "Journal entry", "One JE per month, debit depreciation expense, credit accumulated depreciation, split by class"],
    ["Repair cost", "Bill or expense", "Coded to the asset tag in a custom field so unit economics stay true"],
  ];

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="grid g3">
        <div className="stat accent"><div className="k">Connection</div><div className="v" style={{ fontSize: 27, color: "var(--go)" }}>Healthy</div><div className="f">OAuth token refreshed 41 min ago</div></div>
        <div className="stat"><div className="k">Waiting to post</div><div className="v">{queue}</div><div className="f">{posted ? posted + " posted this session" : "invoices and journal entries"}</div></div>
        <div className="stat"><div className="k">Unmatched customers</div><div className="v" style={{ color: "var(--signal)" }}>1</div><div className="f">Palmetto Build Partners has no QBO record</div></div>
      </div>

      <div className="panel">
        <div className="phead">
          <h3>Ready to post</h3>
          <div className="note">Realm 9130 3547 2201 · sandbox</div>
          <button className="btn sig sm" style={{ marginLeft: 12 }} onClick={run} disabled={posting || queue === 0}>
            {posting ? <><RefreshCw size={13} className="spin" /> Posting…</> : queue === 0 ? <><Check size={13} /> All caught up</> : <>Post {pending.length} to QuickBooks</>}
          </button>
        </div>
        {queue > 0 ? (
          <table className="tbl">
            <thead><tr><th>Reference</th><th>Type</th><th>Customer</th><th>Memo</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {pending.map((p) => (
                <tr key={p.id}>
                  <td className="mono" style={{ fontWeight: 500 }}>{p.id}</td>
                  <td><span className={"pill " + (p.type === "Invoice" ? "p-out" : "p-svc")}>{p.type}</span></td>
                  <td>{p.cust}</td>
                  <td style={{ color: "var(--muted)" }}>{p.memo}</td>
                  <td className="num">{money(p.amt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 28, textAlign: "center", color: "var(--muted)" }}>
            <Check size={22} style={{ color: "var(--go)" }} />
            <div style={{ marginTop: 8, fontSize: 13 }}>Nothing pending. New check-ins land here as soon as a rental period closes.</div>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="phead"><h3>How records line up</h3><div className="note">CLS → QuickBooks Online</div></div>
        <table className="tbl">
          <thead><tr><th>In CLS</th><th>In QuickBooks</th><th>Rule</th></tr></thead>
          <tbody>{MAP.map(([a, b, c]) => (
            <tr key={a}>
              <td style={{ fontWeight: 500 }}>{a}</td>
              <td className="mono" style={{ fontSize: 12 }}>{b}</td>
              <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{c}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <div className="notice">
        <b>Sales tax stays in QuickBooks.</b> CLS sends the taxable subtotal and the jobsite address;
        QBO's automated sales tax picks the county rate. Florida charges tax on the rental of tangible personal property,
        and the surtax varies by county, so let the jobsite address drive it rather than hard-coding a rate. Confirm the
        treatment of delivery charges and damage waiver with your CPA before go-live.
      </div>
    </div>
  );
}

/* ---------------- CPQ: QUOTE DESK ---------------- */
function Quotes({ quotes, assets, bulk, actions, setDoc, onPost }) {
  const [openId, setOpenId] = useState(null);
  const q = quotes.find((x) => x.id === openId);
  return q
    ? <QuoteBuilder q={q} quotes={quotes} actions={actions} assets={assets} bulk={bulk}
        back={() => setOpenId(null)} setDoc={setDoc} onPost={onPost} />
    : <QuoteList quotes={quotes} actions={actions} open={setOpenId} setDoc={setDoc} />;
}

function QuoteList({ quotes, actions, open, setDoc }) {
  /* The quote number is issued by the database under a lock, so two desks
     opening a quote at the same moment can't collide on Q-2431. */
  const newQuote = async () => {
    const first = CUSTOMERS[0] || {};
    const site = SITES.find((sx) => sx.cust === first.id && sx.active !== false) || SITES[0] || {};
    const res = await actions.saveQuote(null, {
      cust: first.id, site: site.name, po: "", waiver: true, delivery: true,
      start: iso(addDays(TODAY, 7)), end: iso(addDays(TODAY, 21)), lines: [],
    });
    if (res && res.id) open(res.id);
  };
  const live = quotes.filter((x) => x.status === "Sent");
  const pipeline = live.reduce((s, x) => s + quoteTotals(x).total, 0);
  const won = quotes.filter((x) => x.status === "Accepted" || x.status === "Converted");

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="grid g4">
        <div className="stat accent">
          <div className="k">Out for signature</div>
          <div className="v">{live.length}</div>
          <div className="f">{money(pipeline)} of open pipeline</div>
        </div>
        <div className="stat">
          <div className="k">Accepted, not yet out</div>
          <div className="v">{won.length}</div>
          <div className="f">holding inventory against the window</div>
        </div>
        <div className="stat">
          <div className="k">Expiring within 5 days</div>
          <div className="v" style={{ color: live.some((x) => (x.expires - TODAY) / DAY <= 5) ? "var(--signal)" : "inherit" }}>
            {live.filter((x) => (x.expires - TODAY) / DAY <= 5).length}
          </div>
          <div className="f">holds release automatically at expiry</div>
        </div>
        <div className="stat">
          <div className="k">Needs approval</div>
          <div className="v" style={{ color: quotes.some((x) => x.status === "Draft" && quoteTotals(x).approval) ? "var(--stop)" : "inherit" }}>
            {quotes.filter((x) => x.status === "Draft" && quoteTotals(x).approval).length}
          </div>
          <div className="f">discount over {cfg.approvalAt}% or credit hold</div>
        </div>
      </div>

      <div className="panel">
        <div className="phead">
          <h3>Quotes</h3>
          <div className="note">soft holds release at expiry</div>
          <button className="btn sig sm" style={{ marginLeft: 12 }} onClick={newQuote}><Plus size={14} /> New quote</button>
        </div>
        <table className="tbl">
          <thead><tr><th>Quote</th><th>Contractor</th><th>Jobsite</th><th>Window</th><th className="num">Lines</th><th>Status</th><th>Expires</th><th className="num">Total</th><th></th></tr></thead>
          <tbody>
            {quotes.map((x) => {
              const t = quoteTotals(x);
              const daysLeft = Math.round((x.expires - TODAY) / DAY);
              return (
                <tr key={x.id} className="click" tabIndex={0} onClick={() => open(x.id)} onKeyDown={(e) => e.key === "Enter" && open(x.id)}>
                  <td className="mono" style={{ fontWeight: 500 }}>{x.id}</td>
                  <td>{custName(x.cust)}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{x.site}</td>
                  <td className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>{fmtD(x.start)} – {fmtD(x.end)}</td>
                  <td className="num">{x.lines.length}</td>
                  <td>
                    <span className={"pill " + (Q_PILL[x.status] || "p-grey")}>{x.status}</span>
                    {t.approval && x.status === "Draft" && <span className="pill p-due" style={{ marginLeft: 5 }}><Lock size={9} /> Approval</span>}
                  </td>
                  <td className="mono" style={{ fontSize: 12, color: x.status === "Sent" && daysLeft <= 5 ? "var(--signal)" : "var(--muted)" }}>
                    {x.status === "Sent" ? (daysLeft > 0 ? daysLeft + "d left" : "expired") : "—"}
                  </td>
                  <td className="num" style={{ fontWeight: 500 }}>{money(t.total)}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setDoc(x.id); }}><FileText size={12} /> Quote</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="notice">
        A sent quote places a <b>soft hold</b> on the pool for its window — it lowers what other quotes can promise and
        releases itself at expiry. Nothing here reserves a specific tag. Serial numbers get assigned on the load sheet
        the morning of delivery, so the unit that goes out is whichever qualifying one is standing in the yard.
      </div>
    </div>
  );
}

function QuoteBuilder({ q, quotes, actions, assets, bulk, back, setDoc, onPost }) {
  /* Edits are held locally so typing stays instant, then written back on a
     debounce. The server is still the authority on what a quote costs and
     whether it may be sent — see the transition handlers below. */
  const [draft, setDraft] = useState(q);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const dirty = useRef(false);

  useEffect(() => { setDraft(q); dirty.current = false; }, [q.id, q.status]);

  useEffect(() => {
    if (!dirty.current || draft.status !== "Draft") return;
    const t = setTimeout(() => {
      actions.saveQuote(draft.id, {
        cust: draft.cust, site: draft.site, po: draft.po,
        waiver: draft.waiver, delivery: draft.delivery,
        start: iso(draft.start), end: iso(draft.end),
        lines: draft.lines.map((l) => ({
          sku: l.sku, qty: l.qty, uomIdx: l.uomIdx,
          start: iso(l.start), end: iso(l.end), disc: l.disc,
        })),
      }).catch(() => {});
      dirty.current = false;
    }, 700);
    return () => clearTimeout(t);
  }, [draft]);

  const t = quoteTotals(draft);
  const cust = CUSTOMERS.find((c) => c.id === draft.cust) || {};
  const locked = draft.status !== "Draft";

  const touch = (fn) => { dirty.current = true; setDraft(fn); };
  const upd = (patch) => touch((d) => ({ ...d, ...patch }));
  const updLine = (lid, patch) => touch((d) => ({
    ...d, lines: d.lines.map((l) => (l.id === lid ? { ...l, ...patch } : l)),
  }));
  const delLine = (lid) => touch((d) => ({ ...d, lines: d.lines.filter((l) => l.id !== lid) }));
  const addLine = (sku) => touch((d) => ({
    ...d, lines: [...d.lines, { id: "new-" + Date.now(), sku, qty: 1, uomIdx: 0, start: d.start, end: d.end, disc: 0 }],
  }));

  /* moving the header window drags any line that was still following it */
  const moveWindow = (which, v) => {
    const nd = fromIso(v);
    touch((d) => ({
      ...d, [which]: nd,
      lines: d.lines.map((l) => (+l[which] === +d[which] ? { ...l, [which]: nd } : l)),
    }));
  };

  /* Credit hold and the discount ceiling are enforced server-side. The UI
     disables the button as a courtesy; the API is what actually refuses. */
  const transition = async (action, body) => {
    setBusy(true);
    setMsg("");
    try {
      await actions.saveQuote(draft.id, {
        cust: draft.cust, site: draft.site, po: draft.po, waiver: draft.waiver,
        delivery: draft.delivery, start: iso(draft.start), end: iso(draft.end),
        lines: draft.lines.map((l) => ({
          sku: l.sku, qty: l.qty, uomIdx: l.uomIdx, start: iso(l.start), end: iso(l.end), disc: l.disc,
        })),
      });
      await actions.quoteAction(draft.id, action, body);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const send = () => transition("send");
  const accept = () => transition("accept");
  const lose = () => transition("lose", { reason: "Price" });
  const postEstimate = () => { transition("post"); onPost(); };

  const sites = SITES.filter((sx) => sx.cust === draft.cust && sx.active !== false);
  /* Availability comes from SQL for this window. A snapshot taken at page
     load goes stale the moment another desk quotes the same lifts. */
  const avail = useAvailability(draft.start, draft.end, draft.id, !locked);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="panel" style={{ padding: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn ghost sm" onClick={back}><ArrowLeft size={13} /> All quotes</button>
        <span className="mono" style={{ fontWeight: 500, fontSize: 15 }}>{draft.id}</span>
        <span className={"pill " + (Q_PILL[draft.status] || "p-svc")}>{draft.status}</span>
        {msg && <span className="mono" style={{ fontSize: 11.5, color: "var(--stop)" }}>{msg}</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn ghost sm" onClick={() => setDoc(draft.id)}><FileText size={13} /> Generate quote</button>
          {draft.status === "Draft" && <button className="btn sig sm" disabled={!draft.lines.length || busy} onClick={send}><Send size={13} /> Reserve &amp; send</button>}
          {draft.status === "Sent" && <><button className="btn sm" disabled={busy} onClick={accept}><Check size={13} /> Mark accepted</button>
            <button className="btn ghost sm" disabled={busy} onClick={lose}>Mark lost</button></>}
          {draft.status === "Accepted" && !draft.posted && <button className="btn sm" onClick={postEstimate}><RefreshCw size={13} /> Post to QuickBooks</button>}
          {draft.status === "Accepted" && <span className="mono" style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center" }}>Load it in the Scan bay</span>}
        </div>
      </div>

      <div className="qgrid">
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div className="panel">
            <div className="phead"><h3>Order header</h3><div className="note">{cust.terms} · {cust.qbo || "not linked to QBO"}</div></div>
            <div className="qhead">
              <div className="field">
                <label>Contractor</label>
                <select className="input" value={draft.cust} disabled={locked}
                  onChange={(e) => { const c = e.target.value; const first = SITES.find((sx) => sx.cust === c); upd({ cust: c, site: first ? first.name : draft.site }); }}>
                  {CUSTOMERS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Jobsite</label>
                <select className="input" value={draft.site} disabled={locked} onChange={(e) => upd({ site: e.target.value })}>
                  {sites.map((sx) => <option key={sx.name} value={sx.name}>{sx.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>On rent from</label>
                <input className="input" type="date" value={iso(draft.start)} disabled={locked} onChange={(e) => moveWindow("start", e.target.value)} />
              </div>
              <div className="field">
                <label>Expected return</label>
                <input className="input" type="date" value={iso(draft.end)} disabled={locked} onChange={(e) => moveWindow("end", e.target.value)} />
              </div>
              <div className="field">
                <label>Customer PO</label>
                <input className="input" value={draft.po} disabled={locked} placeholder="optional" onChange={(e) => upd({ po: e.target.value })} />
              </div>
              <div className="field">
                <label>Damage waiver</label>
                <div className="chips">
                  <button className={"chip" + (draft.waiver ? " on" : "")} disabled={locked} onClick={() => upd({ waiver: true })}>Yes · {cfg.waiver}%</button>
                  <button className={"chip" + (!draft.waiver ? " on" : "")} disabled={locked} onClick={() => upd({ waiver: false })}>Declined</button>
                </div>
              </div>
              <div className="field">
                <label>Delivery</label>
                <div className="chips">
                  <button className={"chip" + (draft.delivery ? " on" : "")} disabled={locked} onClick={() => upd({ delivery: true })}>Round trip</button>
                  <button className={"chip" + (!draft.delivery ? " on" : "")} disabled={locked} onClick={() => upd({ delivery: false })}>Customer pickup</button>
                </div>
              </div>
              <div className="field">
                <label>Window</label>
                <div className="mono" style={{ fontSize: 13, paddingTop: 6 }}>{spanDays(draft.start, draft.end)} days</div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="phead"><h3>Lines</h3><div className="note">availability checked against each line's own dates</div></div>
            {draft.lines.length === 0 ? (
              <div style={{ padding: 28, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                Nothing on this quote yet. Pick from the catalog below.
              </div>
            ) : (
              <table className="tbl">
                <thead><tr><th>Item</th><th className="num">Qty</th><th>Unit</th><th>From</th><th>To</th><th>Available</th><th>Billed as</th><th className="num">Disc</th><th className="num">Net</th><th></th></tr></thead>
                <tbody>
                  {t.priced.map(({ l, p }) => {
                    const av = avail.bySku[l.sku]
                      ? { total: avail.bySku[l.sku].total_units, free: avail.bySku[l.sku].qty_free,
                          nextFree: avail.bySku[l.sku].next_free_date ? new Date(avail.bySku[l.sku].next_free_date) : null }
                      : { total: 0, free: 0, nextFree: null };
                    const short = av.free < p.baseQty;
                    const dots = Math.min(12, av.total);
                    const on = Math.round((av.free / (av.total || 1)) * dots);
                    return (
                      <tr className="qline" key={l.id}>
                        <td style={{ minWidth: 160 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{p.cat.name}</div>
                          <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{l.sku}</div>
                        </td>
                        <td style={{ width: 62 }}>
                          <input type="number" min="1" value={l.qty} disabled={locked}
                            onChange={(e) => updLine(l.id, { qty: Math.max(1, +e.target.value || 1) })} style={{ textAlign: "right" }} />
                        </td>
                        <td style={{ width: 96 }}>
                          <select value={l.uomIdx} disabled={locked || p.cat.uom.length === 1} onChange={(e) => updLine(l.id, { uomIdx: +e.target.value })}>
                            {p.cat.uom.map((u, i) => <option key={u[0]} value={i}>{u[0]}</option>)}
                          </select>
                        </td>
                        <td style={{ width: 122 }}><input type="date" value={iso(l.start)} disabled={locked} onChange={(e) => updLine(l.id, { start: fromIso(e.target.value) })} /></td>
                        <td style={{ width: 122 }}><input type="date" value={iso(l.end)} disabled={locked} onChange={(e) => updLine(l.id, { end: fromIso(e.target.value) })} /></td>
                        <td style={{ width: 132 }}>
                          <div className="avail">
                            <div className="dots">{Array.from({ length: dots }, (_, i) => <i key={i} className={i < on ? "" : "no"} />)}</div>
                            <span className="mono" style={{ fontSize: 11, color: short ? "var(--stop)" : "var(--muted)" }}>{av.free}/{av.total}</span>
                          </div>
                          {short && <div className="mono" style={{ fontSize: 10, color: "var(--stop)", marginTop: 2 }}>
                            {av.nextFree ? "free " + fmtD(av.nextFree) : "short by " + (p.baseQty - av.free)}
                          </div>}
                        </td>
                        <td>
                          <div className="mono" style={{ fontSize: 11.5 }}>{ladderLabel(p.lad)}</div>
                          {p.straight && p.straight > p.list && <div className="mono" style={{ fontSize: 10, color: "var(--go)" }}>saves {money(p.straight - p.list)}</div>}
                        </td>
                        <td className="num" style={{ width: 66 }}>
                          <input type="number" min="0" max="45" value={l.disc} disabled={locked}
                            onChange={(e) => updLine(l.id, { disc: Math.max(0, Math.min(45, +e.target.value || 0)) })} style={{ textAlign: "right" }} />
                        </td>
                        <td className="num" style={{ fontWeight: 500, whiteSpace: "nowrap" }}>
                          {money(p.net)}
                          {p.under && <div className="mono" style={{ fontSize: 10, color: "var(--stop)", fontWeight: 400 }}>below floor</div>}
                        </td>
                        <td style={{ width: 26 }}>
                          {!locked && <button className="del" onClick={() => delLine(l.id)} aria-label="Remove line"><Trash2 size={13} /></button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {!locked && (
            <div className="panel">
              <div className="phead"><h3>Catalog</h3><div className="note">
                {avail.loading ? "checking availability\u2026" : "availability for " + fmtD(draft.start) + " \u2013 " + fmtD(draft.end)}
              </div></div>
              <div className="picker">
                {CATALOG.map((c) => {
                  const a = avail.bySku[c.sku];
                  const av = a
                    ? { total: a.total_units, free: a.qty_free,
                        nextFree: a.next_free_date ? new Date(a.next_free_date) : null }
                    : { total: 0, free: 0, nextFree: null };
                  const lad = ladder(c.rates, spanDays(draft.start, draft.end));
                  return (
                    <button className="pcard" key={c.sku} disabled={av.free < 1} onClick={() => addLine(c.sku)}>
                      <div className="n">{c.name}</div>
                      <div className="s">{c.sku} · {c.cat.toUpperCase()}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                        <span className={"pill " + (av.free < 1 ? "p-stop" : av.free < 3 ? "p-due" : "p-go")}>
                          {av.free < 1 ? (av.nextFree ? fmtD(av.nextFree) : "none free") : av.free + " free"}
                        </span>
                        <span className="mono" style={{ fontSize: 11 }}>{money(lad.cost)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="qside">
          {t.approval && (
            <div className="warn">
              <b>Needs approval</b>
              {t.hold
                ? cust.name + " is on credit hold. Accounting has to clear the account before this quote can go out."
                : "Line discount reaches " + Math.round(t.maxDisc) + "%, over the " + cfg.approvalAt + "% desk limit. An Ops role has to release it."}
            </div>
          )}
          {t.under && !t.approval && (
            <div className="warn">
              <b>Below rate floor</b>
              A line is priced under its monthly depreciation plus target margin. It can still go out — but it isn't paying for the asset.
            </div>
          )}

          <div className="panel">
            <div className="phead"><h3>Price</h3><div className="note">{spanDays(draft.start, draft.end)} days</div></div>
            <div className="wf">
              <div className="r"><span>List, laddered</span><span>{money(t.list)}</span></div>
              {t.saved > 0 && <div className="r neg"><span>Ladder saving vs daily</span><span>−{money(t.saved)}</span></div>}
              <div className="r"><span>Customer rate{termsFor(draft.cust).disc ? " (" + termsFor(draft.cust).disc + "%)" : ""}</span>
                <span>{money(t.rental - t.list)}</span></div>
              <div className="r sub"><span>Rental subtotal</span><span>{money(t.rental)}</span></div>
              {draft.waiver && <div className="r"><span>Damage waiver {cfg.waiver}%</span><span>{money(t.waiver)}</span></div>}
              {draft.delivery && <div className="r"><span>Delivery + pickup, {t.city}</span><span>{money(t.freight)}</span></div>}
              <div className="r"><span>Environmental {cfg.enviro}%</span><span>{money(t.enviro)}</span></div>
              <div className="r sub"><span>Taxable</span><span>{money(t.taxable)}</span></div>
              <div className="r"><span>Est. sales tax {t.rate.toFixed(1)}%</span><span>{money(t.tax)}</span></div>
              <div className="r tot"><span>Quote total</span><span>{money(t.total)}</span></div>
              <div className="r"><span>Deposit at signing {cfg.deposit}%</span><span>{money(t.deposit)}</span></div>
            </div>
          </div>

          <div className="notice">
            Tax shown is an estimate from the jobsite county. QuickBooks computes the rate that actually invoices —
            Florida's discretionary surtax varies by county, so the jobsite address drives it, not the yard's.
          </div>
        </div>
      </div>
    </div>
  );
}

function QuoteDoc({ q, close }) {
  const t = quoteTotals(q);
  const cust = CUSTOMERS.find((c) => c.id === q.cust) || {};
  return (
    <div className="paperwrap" onClick={close}>
      <div className="paper" onClick={(e) => e.stopPropagation()}>
        <div className="ph">
          <div>
            <div className="mk">CONTRACTOR LEASING<br /><span>SOLUTIONS</span></div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: ".1em", color: "var(--muted)", marginTop: 6 }}>
              RENTAL QUOTATION · TAMPA YARD
            </div>
          </div>
          <div className="meta">
            <b>{q.id}</b><br />
            Issued {fmtD(q.created)}<br />
            Valid through {fmtD(q.expires)}<br />
            {q.po ? "PO " + q.po : "PO on acceptance"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 40, marginTop: 20 }}>
          <div style={{ flex: 1 }}>
            <h4>Prepared for</h4>
            <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
              <b>{cust.name}</b><br />{q.site}<br />{cust.city}, FL<br />
              <span style={{ color: "var(--muted)" }}>Terms: {cust.terms}</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <h4>Rental period</h4>
            <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
              {fmtD(q.start)} through {fmtD(q.end)}<br />
              <b>{spanDays(q.start, q.end)} days</b><br />
              <span style={{ color: "var(--muted)" }}>{q.delivery ? "Delivered and picked up" : "Customer pickup at yard"}</span>
            </div>
          </div>
        </div>

        <h4>Equipment</h4>
        <table className="tbl">
          <thead><tr><th>Item</th><th className="num">Qty</th><th>Unit</th><th>Period</th><th>Billed as</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {t.priced.map(({ l, p }) => (
              <tr key={l.id}>
                <td>{p.cat.name}
                  {p.cat.desc && <div style={{ fontSize: 10.5, color: "var(--muted)", lineHeight: 1.45, marginTop: 2 }}>{p.cat.desc}</div>}
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{l.sku}</div></td>
                <td className="num">{l.qty}</td>
                <td className="mono" style={{ fontSize: 12 }}>{p.uom[0]}</td>
                <td className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>{fmtD(l.start)} – {fmtD(l.end)}</td>
                <td className="mono" style={{ fontSize: 11.5 }}>{ladderLabel(p.lad)}</td>
                <td className="num">{money(p.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <div style={{ width: 300 }}>
            <div className="wf" style={{ border: "1px solid var(--line)" }}>
              <div className="r"><span>Rental subtotal</span><span>{money(t.rental)}</span></div>
              {q.waiver && <div className="r"><span>Damage waiver</span><span>{money(t.waiver)}</span></div>}
              {q.delivery && <div className="r"><span>Delivery + pickup</span><span>{money(t.freight)}</span></div>}
              <div className="r"><span>Environmental</span><span>{money(t.enviro)}</span></div>
              <div className="r"><span>Est. sales tax</span><span>{money(t.tax)}</span></div>
              <div className="r tot"><span>Total</span><span>{money(t.total)}</span></div>
              <div className="r"><span>Deposit at signing</span><span>{money(t.deposit)}</span></div>
            </div>
          </div>
        </div>

        {t.saved > 0 && (
          <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--go)" }}>
            Terms laddered to your dates — {money(t.saved)} below straight daily rate.
          </div>
        )}

        <h4>Terms</h4>
        <div className="terms">
          Rates are per unit and cover a 7-day week or 28-day month, whichever combination bills lowest for the dates shown.
          Quantities are held against this window until the quote expires and are released automatically after that date.
          Specific units are assigned at dispatch. Rental time accrues from delivery to the date equipment is called off rent
          and available for pickup. Fuel, consumables, and damage beyond the waiver are billed at cost. Sales tax is estimated
          from the jobsite county and finalized at invoice. Equipment remains the property of the lessor at all times.
        </div>

        <div className="sig">
          <div>Accepted for {cust.name} · date</div>
          <div>Contractor Leasing Solutions · date</div>
        </div>

        <div className="noprint" style={{ display: "flex", gap: 8, marginTop: 26, justifyContent: "flex-end" }}>
          <button className="btn ghost sm" onClick={close}>Close</button>
          <button className="btn sig sm" onClick={() => window.print()}><Printer size={13} /> Print / save as PDF</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- PRINTABLE: PACKING LIST & TAG SHEET ---------------- */
function Letterhead({ kind, ref1, ref2 }) {
  return (
    <div className="ph">
      <div>
        <div className="mk">CONTRACTOR LEASING<br /><span>SOLUTIONS</span></div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: ".1em", color: "var(--muted)", marginTop: 6 }}>
          {kind} · TAMPA YARD
        </div>
      </div>
      <div className="meta">
        <b>{ref1}</b><br />
        {ref2}<br />
        {TODAY.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </div>
    </div>
  );
}

function PackingDoc({ q, site, cust, tags, mode, assets, close }) {
  const rows = tags.map((t) => assets.find((a) => a.tag === t)).filter(Boolean);
  const siteName = q ? q.site : site;
  const custRec = CUSTOMERS.find((c) => c.id === (q ? q.cust : cust)) || {};
  const siteInfo = siteRec(siteName);
  const out = mode === "out";
  const bulkLines = q && out ? q.lines.filter((l) => {
    const cat = CATALOG.find((c) => c.sku === l.sku);
    return cat && !cat.ser;
  }) : [];

  return (
    <div className="paperwrap" onClick={close}>
      <div className="paper" onClick={(e) => e.stopPropagation()}>
        <Letterhead kind={out ? "PACKING LIST · DELIVERY" : "RETURN RECEIPT"}
          ref1={q ? q.id : (siteName || "AD HOC")} ref2={q && q.po ? "PO " + q.po : "No purchase order"} />

        <div style={{ display: "flex", gap: 40, marginTop: 20 }}>
          <div style={{ flex: 1 }}>
            <h4>{out ? "Deliver to" : "Received from"}</h4>
            <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
              <b>{custRec.name || "—"}</b><br />
              {siteName || "—"}<br />
              {siteInfo.county ? siteInfo.county + " County, FL" : ""}<br />
              <span style={{ color: "var(--muted)" }}>{siteInfo.super ? "Attn: " + siteInfo.super : ""}</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <h4>{out ? "Rental period" : "Received"}</h4>
            <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
              {out ? (q ? fmtD(q.start) + " through " + fmtD(q.end) : "Open ended") : fmtD(TODAY) + " at the yard"}<br />
              <b>{rows.length} serialized unit{rows.length === 1 ? "" : "s"}</b>
              {bulkLines.length > 0 && <> plus {bulkLines.length} counted line{bulkLines.length === 1 ? "" : "s"}</>}<br />
              <span style={{ color: "var(--muted)" }}>Checked by M. Reyes, yard lead</span>
            </div>
          </div>
        </div>

        <h4>Serialized units — scanned</h4>
        <table className="tbl">
          <thead><tr><th>Tag</th><th>Model</th><th>SKU</th><th>Condition out</th><th className="num">Meter</th><th>Condition back</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.tag}>
                <td className="mono" style={{ fontWeight: 500 }}>{a.tag}</td>
                <td>{a.name}</td>
                <td className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>{a.sku}</td>
                <td style={{ fontSize: 12.5 }}>{a.cond}</td>
                <td className="num">{a.meter != null ? a.meter.toLocaleString() + " h" : "—"}</td>
                <td style={{ color: "var(--line)" }}>____________</td>
              </tr>
            ))}
          </tbody>
        </table>

        {bulkLines.length > 0 && (
          <>
            <h4>Counted items</h4>
            <table className="tbl">
              <thead><tr><th>Item</th><th className="num">Ordered</th><th className="num">Base units</th><th>Counted by</th></tr></thead>
              <tbody>
                {bulkLines.map((l) => {
                  const cat = CATALOG.find((c) => c.sku === l.sku);
                  const uom = cat.uom[l.uomIdx] || cat.uom[0];
                  return (
                    <tr key={l.id}>
                      <td>{cat.name}<div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{l.sku}</div></td>
                      <td className="num">{l.qty} {uom[0].toLowerCase()}{l.qty > 1 ? "s" : ""}</td>
                      <td className="num">{l.qty * uom[1]}</td>
                      <td style={{ color: "var(--line)" }}>____________</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        <h4>Terms</h4>
        <div className="terms">
          {out
            ? "Signature below confirms the units listed were received in the condition noted, with all guards, keys, and accessories present. Rental time accrues from this date. Report damage or shortage within 24 hours; after that the condition recorded here stands. Equipment remains the property of the lessor and may not be moved to another jobsite without written consent."
            : "Signature below confirms the units listed were returned on this date. Rental time stops here. Condition is recorded at the yard after inspection and cleaning; fuel, damage beyond the waiver, and missing accessories are billed at cost against the contract."}
        </div>

        <div className="sig">
          <div>{out ? "Received on site · print name, sign, date" : "Released by · print name, sign, date"}</div>
          <div>Contractor Leasing Solutions · driver, date</div>
        </div>

        <div className="noprint" style={{ display: "flex", gap: 8, marginTop: 26, justifyContent: "flex-end" }}>
          <button className="btn ghost sm" onClick={close}>Close</button>
          <button className="btn sig sm" onClick={() => window.print()}><Printer size={13} /> Print / save as PDF</button>
        </div>
      </div>
    </div>
  );
}

function TagLabel({ a }) {
  return (
    <div className="lbl">
      <div className="lt">{a.tag}</div>
      <div className="ln">{a.name}</div>
      <div className="lq"><QRArt seed={a.tag} size={86} fg="#11181C" bg="#FFFFFF" /></div>
      <div className="lf">cls.example.com/a/{a.tag}</div>
    </div>
  );
}

function TagSheet({ tags, assets, close }) {
  const rows = tags.map((t) => assets.find((a) => a.tag === t)).filter(Boolean);
  return (
    <div className="paperwrap" onClick={close}>
      <div className="paper" onClick={(e) => e.stopPropagation()}>
        <Letterhead kind="ASSET TAG SHEET" ref1={rows.length + " label" + (rows.length === 1 ? "" : "s")} ref2="3 x 2 in polyester" />
        <h4>Print on 3 x 2 in polyester labels, UV laminate</h4>
        <div className="labelgrid">
          {rows.map((a) => <TagLabel key={a.tag} a={a} />)}
        </div>
        <div className="terms noprint" style={{ marginTop: 18 }}>
          Codes shown are placeholder patterns. In production each encodes its asset URL through a real QR encoder at
          error correction level M — scanning it opens the scan bay with the tag already filled in. Put a second label
          on the opposite side of anything large; labels get scraped off in a laydown yard.
        </div>
        <div className="noprint" style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          <button className="btn ghost sm" onClick={close}>Close</button>
          <button className="btn sig sm" onClick={() => window.print()}><Printer size={13} /> Print / save as PDF</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- CONTRACTORS & JOBSITES ---------------- */
function Contractors({ assets, quotes, actions }) {
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState(null);   // {kind:'cust'|'site', item?, cust?}

  const stats = useMemo(() => {
    const m = {};
    CUSTOMERS.forEach((c) => { m[c.id] = { out: 0, run: 0, quotes: 0 }; });
    assets.filter((a) => a.status === "On rent" && m[a.cust]).forEach((a) => {
      m[a.cust].out++;
      m[a.cust].run += a.term === "day" ? a.rates.day * 20 : a.term === "week" ? a.rates.week * 4 : a.rates.month;
    });
    quotes.filter((x) => (x.status === "Draft" || x.status === "Sent") && m[x.cust]).forEach((x) => { m[x.cust].quotes++; });
    return m;
  }, [assets, quotes]);

  const saveCust = async (rec) => {
    await actions.saveCustomer(rec.id, rec);
    setForm(null);
  };
  const saveSite = async (rec) => {
    await actions.saveJobsite(rec.id || null, rec);
    setForm(null);
  };

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="grid g4">
        <div className="stat accent">
          <div className="k">Contractors</div>
          <div className="v">{CUSTOMERS.length}</div>
          <div className="f">{SITES.filter((s) => s.active !== false).length} active jobsites</div>
        </div>
        <div className="stat">
          <div className="k">On credit hold</div>
          <div className="v" style={{ color: CUSTOMERS.some((c) => c.credit === "hold") ? "var(--stop)" : "inherit" }}>
            {CUSTOMERS.filter((c) => c.credit === "hold").length}
          </div>
          <div className="f">quotes blocked until accounting clears</div>
        </div>
        <div className="stat">
          <div className="k">Not linked to QuickBooks</div>
          <div className="v" style={{ color: CUSTOMERS.some((c) => !c.qbo) ? "var(--signal)" : "inherit" }}>
            {CUSTOMERS.filter((c) => !c.qbo).length}
          </div>
          <div className="f">invoices can't post without a match</div>
        </div>
        <div className="stat">
          <div className="k">Total run rate</div>
          <div className="v">{money(Object.values(stats).reduce((s, x) => s + x.run, 0) / 1000)}<small>k</small></div>
          <div className="f">28-day equivalent across all open rentals</div>
        </div>
      </div>

      <div className="panel">
        <div className="phead">
          <h3>Contractors</h3>
          <div className="note">jobsites drive tax county and delivery zone</div>
          <button className="btn sig sm" style={{ marginLeft: 12 }} onClick={() => setForm({ kind: "cust" })}>
            <Plus size={13} /> Add contractor
          </button>
        </div>
        <table className="tbl">
          <thead><tr><th></th><th>Contractor</th><th>Contact</th><th>Terms</th><th className="num">Rate disc</th><th>Credit</th><th>QuickBooks</th><th className="num">Jobsites</th><th className="num">Units out</th><th className="num">Run rate</th><th></th></tr></thead>
          <tbody>
            {CUSTOMERS.map((c) => {
              const sites = SITES.filter((s) => s.cust === c.id);
              const st = stats[c.id] || { out: 0, run: 0, quotes: 0 };
              const isOpen = open === c.id;
              return (
                <React.Fragment key={c.id}>
                  <tr className="click" onClick={() => setOpen(isOpen ? null : c.id)}>
                    <td style={{ width: 22, color: "var(--muted)" }}>
                      <ChevronRight size={13} style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: ".15s" }} />
                    </td>
                    <td style={{ fontWeight: 500 }}>{c.name}<div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{c.id} · {c.city}</div></td>
                    <td style={{ fontSize: 12.5 }}>{c.contact}<div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{c.phone}</div></td>
                    <td style={{ fontSize: 12.5 }}>{c.terms}</td>
                    <td className="num">{c.disc ? c.disc + "%" : "—"}</td>
                    <td><span className={"pill " + (c.credit === "hold" ? "p-stop" : "p-go")}>{c.credit === "hold" ? "Hold" : "Good"}</span></td>
                    <td className="mono" style={{ fontSize: 11.5, color: c.qbo ? "var(--muted)" : "var(--signal)" }}>{c.qbo || "not linked"}</td>
                    <td className="num">{sites.length}</td>
                    <td className="num">{st.out}</td>
                    <td className="num" style={{ fontWeight: 500 }}>{st.run ? money(st.run) : "—"}</td>
                    <td style={{ textAlign: "right", width: 44 }}>
                      <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setForm({ kind: "cust", item: c }); }} aria-label={"Edit " + c.name}>
                        <Pencil size={12} />
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={11} style={{ background: "var(--panel-2)", padding: "12px 14px 14px 36px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                          <span className="eyebrow">Jobsites</span>
                          <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={() => setForm({ kind: "site", cust: c.id })}>
                            <Plus size={12} /> Add jobsite
                          </button>
                        </div>
                        {sites.length === 0
                          ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No jobsites yet. Quotes need one before they can price delivery or tax.</div>
                          : (
                            <table className="tbl" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
                              <thead><tr><th>Jobsite</th><th>Superintendent</th><th>County</th><th className="num">Surtax</th><th className="num">Delivery each way</th><th className="num">Units on site</th><th>Status</th><th></th></tr></thead>
                              <tbody>
                                {sites.map((s) => {
                                  const onSite = assets.filter((a) => a.site === s.name && a.status === "On rent").length;
                                  return (
                                    <tr key={s.name}>
                                      <td style={{ fontWeight: 500 }}>{s.name}</td>
                                      <td style={{ fontSize: 12.5, color: "var(--muted)" }}>{s.super}</td>
                                      <td style={{ fontSize: 12.5 }}>{s.county}</td>
                                      <td className="num">{COUNTY_SURTAX[s.county] != null ? COUNTY_SURTAX[s.county].toFixed(1) + "%" : "—"}</td>
                                      <td className="num">{money(s.zone)}</td>
                                      <td className="num">{onSite || "—"}</td>
                                      <td><span className={"pill " + (s.active === false ? "p-grey" : "p-go")}>{s.active === false ? "Closed" : "Active"}</span></td>
                                      <td style={{ textAlign: "right", width: 44 }}>
                                        <button className="btn ghost sm" onClick={() => setForm({ kind: "site", item: s, cust: c.id })} aria-label={"Edit " + s.name}>
                                          <Pencil size={12} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="notice">
        The jobsite, not the contractor's office, decides two numbers on every quote: the <b>delivery zone</b> and the
        <b> county surtax</b>. A Tampa GC building in Orange County pays Orange County's rate. Closing a jobsite keeps its
        history but takes it out of the quote picker.
      </div>

      {form && form.kind === "cust" && <CustomerForm item={form.item} save={saveCust} close={() => setForm(null)} />}
      {form && form.kind === "site" && <SiteForm item={form.item} custId={form.cust} save={saveSite} close={() => setForm(null)} />}
    </div>
  );
}

function CustomerForm({ item, save, close }) {
  const editing = !!item;
  const [f, setF] = useState(item || {
    id: "C-" + (101 + CUSTOMERS.length), name: "", terms: "Net 30", qbo: "", city: "Tampa",
    disc: 0, credit: "ok", contact: "", phone: "",
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <div className="mwrap" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mhead">
          <h3>{editing ? "Edit contractor" : "Add contractor"}</h3>
          <button className="dclose" style={{ marginLeft: "auto" }} onClick={close} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="mbody">
          <Field label="Company name" full>
            <input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="General contractor" />
          </Field>
          <Field label="Primary contact"><input className="input" value={f.contact} onChange={(e) => set("contact", e.target.value)} /></Field>
          <Field label="Phone"><input className="input" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Office city"><input className="input" value={f.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="Payment terms">
            <select className="input" value={f.terms} onChange={(e) => set("terms", e.target.value)}>
              {["Due on receipt", "Net 15", "Net 30", "Net 45", "Net 60"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Negotiated discount %" hint="Applied to list before volume breaks.">
            <input className="input" type="number" min="0" max="40" value={f.disc} onChange={(e) => set("disc", +e.target.value || 0)} />
          </Field>
          <Field label="Credit status" hint="A hold blocks quotes from going out.">
            <select className="input" value={f.credit} onChange={(e) => set("credit", e.target.value)}>
              <option value="ok">Good standing</option>
              <option value="hold">Credit hold</option>
            </select>
          </Field>
          <Field label="QuickBooks customer" full hint="Leave blank until matched — unlinked customers can't be invoiced.">
            <input className="input" value={f.qbo || ""} onChange={(e) => set("qbo", e.target.value)} placeholder="QBO:000" />
          </Field>
        </div>
        <div className="mfoot">
          <button className="btn ghost sm" onClick={close}>Cancel</button>
          <button className="btn sig sm" disabled={!f.name.trim()} onClick={() => save({ ...f, qbo: f.qbo || null })}>
            <Check size={13} /> {editing ? "Save changes" : "Add contractor"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SiteForm({ item, custId, save, close }) {
  const editing = !!item;
  const [f, setF] = useState(item || { name: "", cust: custId, county: "Hillsborough", zone: 165, super: "", active: true });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const prevName = item ? item.name : null;
  return (
    <div className="mwrap" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mhead">
          <h3>{editing ? "Edit jobsite" : "Add jobsite"}</h3>
          <button className="dclose" style={{ marginLeft: "auto" }} onClick={close} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="mbody">
          <Field label="Jobsite name" full>
            <input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Project or address" />
          </Field>
          <Field label="Contractor" full>
            <select className="input" value={f.cust} onChange={(e) => set("cust", e.target.value)}>
              {CUSTOMERS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Superintendent"><input className="input" value={f.super} onChange={(e) => set("super", e.target.value)} /></Field>
          <Field label="County" hint="Drives the discretionary surtax on every invoice.">
            <select className="input" value={f.county} onChange={(e) => set("county", e.target.value)}>
              {Object.keys(COUNTY_SURTAX).map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Delivery each way" hint="Round trip is charged at twice this.">
            <input className="input" type="number" value={f.zone} onChange={(e) => set("zone", +e.target.value || 0)} />
          </Field>
          <Field label="Status" hint="Closed sites drop out of the quote picker.">
            <select className="input" value={f.active ? "1" : "0"} onChange={(e) => set("active", e.target.value === "1")}>
              <option value="1">Active</option>
              <option value="0">Closed</option>
            </select>
          </Field>
          <div className="full notice">
            Surtax here is {COUNTY_SURTAX[f.county] != null ? COUNTY_SURTAX[f.county].toFixed(1) + "%" : "unset"} on top of
            Florida's {cfg.tax.toFixed(1)}% — an estimate for quoting only. QuickBooks computes the rate that actually invoices.
          </div>
        </div>
        <div className="mfoot">
          <button className="btn ghost sm" onClick={close}>Cancel</button>
          <button className="btn sig sm" disabled={!f.name.trim()} onClick={() => save(f, prevName)}>
            <Check size={13} /> {editing ? "Save changes" : "Add jobsite"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- ACCESS ---------------- */
function Access() {
  const ROLES = [
    ["Yard crew", "Scan in and out, add photos and meter readings, open work orders", "No cost, book value, or margin anywhere"],
    ["Dispatch", "Create and edit contracts, reserve units, schedule delivery", "Cannot change rates or asset cost"],
    ["Ops manager", "Rates, catalog, reservations, write-offs, all reports", "Cannot post to QuickBooks"],
    ["Accounting", "Depreciation settings, QuickBooks posting, invoice review", "Cannot check assets in or out"],
    ["Contractor", "Their own jobsites: what's out, when it's due, delivery tickets", "Scoped to one customer; no cost or other customers"],
    ["Admin", "Invitations, integration credentials, audit log", "Full access, every action logged"],
  ];
  const PEOPLE = [
    ["Marisol Reyes", "Yard crew", "Microsoft", "today", false],
    ["Rafael Alvarez", "Yard crew", "Microsoft", "today", false],
    ["Dana Nguyen", "Dispatch", "Microsoft", "today", false],
    ["Curtis Boyd", "Ops manager", "Microsoft", "yesterday", false],
    ["Elaine Park", "Accounting", "Microsoft", "3 days ago", false],
    ["Tom Whitfield", "Contractor · Suncoast", "Google", "6 days ago", false],
    ["J. Okafor", "Contractor · Baycrest", "Microsoft", "12 days ago", false],
    ["Seasonal driver 2", "Yard crew", "Google", "74 days ago", true],
  ];
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="notice">
        <b>Access is by invitation, not by email address.</b> Anyone can sign in with an account they already have —
        work Microsoft, personal Microsoft, Google. What they see is set by the invitation you sent them. That means a
        contractor's PM, a seasonal driver, or an outside bookkeeper is onboarded in a minute, and it also means
        <b> nobody loses access automatically when they leave</b>. Disabling them here is the step that matters.
      </div>

      <div className="panel">
        <div className="phead">
          <h3>People with access</h3>
          <div className="note">sorted by last sign-in</div>
          <button className="btn sig sm" style={{ marginLeft: 12 }}>Invite someone</button>
        </div>
        <table className="tbl">
          <thead><tr><th>Name</th><th>Role</th><th>Signs in with</th><th>Last seen</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {PEOPLE.map(([n, r, prov, seen, stale]) => (
              <tr key={n}>
                <td style={{ fontWeight: 500 }}>{n}</td>
                <td>{r}</td>
                <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{prov}</td>
                <td className="mono" style={{ fontSize: 12, color: stale ? "var(--stop)" : "var(--muted)" }}>{seen}</td>
                <td>{stale
                  ? <span className="pill p-stop"><AlertTriangle size={10} /> Idle 60+ days</span>
                  : <span className="pill p-go">Active</span>}</td>
                <td style={{ textAlign: "right" }}><button className="btn ghost sm">{stale ? "Disable" : "Change role"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="phead"><h3>Roles</h3><div className="note">enforced in the API, not just the interface</div></div>
        <table className="tbl">
          <thead><tr><th>Role</th><th>Can do</th><th>Cannot do</th></tr></thead>
          <tbody>{ROLES.map(([r, can, cant]) => (
            <tr key={r}>
              <td style={{ fontWeight: 500 }}>{r}</td>
              <td style={{ fontSize: 12.5 }}>{can}</td>
              <td style={{ fontSize: 12.5, color: "var(--muted)" }}>{cant}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <div className="grid g3">
        <div className="panel">
          <div className="phead"><h3>Quarterly review</h3></div>
          <div style={{ padding: 14, fontSize: 13, lineHeight: 1.7, color: "var(--muted)" }}>
            Every 90 days this screen asks an admin to confirm or disable each person. The reminder doesn't dismiss
            until the list is clear. Accounts idle 60 days disable themselves and reactivate in one click.
          </div>
        </div>
        <div className="panel">
          <div className="phead"><h3>Step-up sign-in</h3></div>
          <div style={{ padding: 14, fontSize: 13, lineHeight: 1.7, color: "var(--muted)" }}>
            Posting to QuickBooks, editing a rate card, or writing off an asset asks for the password again.
            Accounting and Admin sessions expire after 8 hours; yard sessions last the week.
          </div>
        </div>
        <div className="panel">
          <div className="phead"><h3>Audit trail</h3></div>
          <div style={{ padding: 14, fontSize: 13, lineHeight: 1.7, color: "var(--muted)" }}>
            Every scan, rate change, invitation, and QuickBooks post writes an append-only row with the user,
            sign-in provider, timestamp, and device. History is reversed with a correcting entry, never deleted.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- DETAIL DRAWER ---------------- */
function Detail({ item, close, setSheet }) {
  const isBulk = !!item.bulk;
  const d = depreciate(item, isBulk ? item.total : 1);
  const [, label] = isBulk ? ["", "Available"] : statusPill(item);
  const ds = item.due ? dueState(item) : null;

  const sched = useMemo(() => {
    const out = [];
    for (let y = 0; y <= Math.ceil(item.life / 12); y++) {
      const mo = Math.min(item.life, y * 12);
      out.push({ y: "Yr " + y, nbv: Math.max(d.salv, d.cost - d.perMo * mo) });
    }
    return out;
  }, [item, d]);

  return (
    <aside className="drawer" role="dialog" aria-label="Asset record">
      <div className="dhead">
        <div>
          <h2>{item.name}</h2>
          <div className="sk">{isBulk ? item.sku + " · BULK STOCK · " + item.total + " UNITS" : item.tag + " · " + item.sku + " · " + item.cat.toUpperCase()}</div>
          {(CATALOG.find((c) => c.sku === item.sku) || {}).desc &&
            <div style={{ fontSize: 12, color: "#93A29B", lineHeight: 1.55, marginTop: 7, maxWidth: 400 }}>
              {(CATALOG.find((c) => c.sku === item.sku) || {}).desc}
            </div>}
        </div>
        <button className="dclose" onClick={close} aria-label="Close"><X size={16} /></button>
      </div>

      <div className="dbody">
        {!isBulk && (
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ width: 150, flex: "0 0 150px" }}><Plate a={item} size={124} lg /></div>
            <div style={{ flex: 1 }}>
              <span className={"pill " + statusPill(item)[0]}>{label}</span>
              <dl className="kv" style={{ marginTop: 11 }}>
                <dt>Condition</dt><dd>{item.cond}</dd>
                <dt>Yard slot</dt><dd>{item.bin}</dd>
                {item.meter != null && <><dt>Meter</dt><dd>{item.meter.toLocaleString()} hrs</dd></>}
                <dt>In service</dt><dd>{fmtD(item.inSvc)}</dd>
              </dl>
              <button className="btn ghost sm" style={{ marginTop: 11 }}
                onClick={() => setSheet && setSheet({ kind: "tags", tags: [item.tag] })}>
                <Printer size={13} /> Reprint tag
              </button>
            </div>
          </div>
        )}

        {item.site && (
          <div className="panel">
            <div className="phead"><h3>Current deployment</h3></div>
            <div style={{ padding: 14 }}>
              <dl className="kv">
                <dt>Contractor</dt><dd style={{ fontFamily: "var(--body)" }}>{custName(item.cust)}</dd>
                <dt>Jobsite</dt><dd style={{ fontFamily: "var(--body)" }}>{item.site}</dd>
                <dt>Out since</dt><dd>{fmtD(item.start)}</dd>
                <dt>Term</dt><dd style={{ textTransform: "capitalize" }}>{item.term === "month" ? "28-day" : item.term}</dd>
                <dt>Due back</dt><dd style={{ color: ds?.k === "over" ? "var(--stop)" : "inherit" }}>{fmtD(item.due)} · {ds?.label}</dd>
              </dl>
            </div>
          </div>
        )}

        <div className="panel">
          <div className="phead"><h3>Unit of measure</h3><div className="note">how it's counted and quoted</div></div>
          <div className="ladder">
            {item.uom.map(([nm, mult], i) => (
              <div className="step" key={nm}>
                <span className="lvl">{i + 1}</span>
                <span className="nm">{nm}</span>
                <span className="cv">{mult === 1 ? "base unit" : mult + " × " + item.uom[0][0].toLowerCase()}</span>
              </div>
            ))}
          </div>
          {item.uom.length > 1 && (
            <div style={{ padding: "0 14px 13px", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
              Quote at any level; stock always moves in base units. A {item.uom[item.uom.length - 1][0].toLowerCase()} out
              the gate decrements {item.uom[item.uom.length - 1][1]} {item.uom[0][0].toLowerCase()}s.
            </div>
          )}
        </div>

        <div className="panel">
          <div className="phead"><h3>Rate card</h3><div className="note">per {item.uom[0][0].toLowerCase()}</div></div>
          <table className="tbl">
            <thead><tr><th>Term</th><th>Billing period</th><th className="num">Rate</th><th className="num">Per day</th></tr></thead>
            <tbody>
              {[["Daily", "day", 1], ["Weekly", "week", 7], ["28-day", "month", 28]].map(([lbl, k, days]) => (
                <tr key={k} style={{ opacity: item.rates[k] ? 1 : .4 }}>
                  <td style={{ fontWeight: 500 }}>{lbl}</td>
                  <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{days} calendar day{days > 1 ? "s" : ""}</td>
                  <td className="num">{item.rates[k] ? money2(item.rates[k]) : "not offered"}</td>
                  <td className="num" style={{ color: "var(--muted)" }}>{item.rates[k] ? money2(item.rates[k] / days) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="phead"><h3>Depreciation</h3><div className="note">straight-line · {item.life} months</div></div>
          <div style={{ padding: 14 }}>
            <dl className="kv">
              <dt>Original cost{isBulk ? " (" + item.total + " units)" : ""}</dt><dd>{money(d.cost)}</dd>
              <dt>Salvage value</dt><dd>{money(d.salv)}</dd>
              <dt>Monthly expense</dt><dd>{money2(d.perMo)}</dd>
              <dt>Months elapsed</dt><dd>{d.elapsed} of {item.life}</dd>
              <dt>Accumulated</dt><dd>{money(d.accum)}</dd>
              <dt style={{ fontWeight: 600, color: "var(--ink)" }}>Net book value</dt><dd style={{ fontWeight: 600 }}>{money(d.nbv)}</dd>
            </dl>
            <div style={{ height: 128, marginTop: 14 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={sched} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#DDE1DA" vertical={false} />
                  <XAxis dataKey="y" tick={{ fontSize: 9.5, fontFamily: "IBM Plex Mono", fill: "#6A776F" }} axisLine={{ stroke: "#CBD1C9" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 9.5, fontFamily: "IBM Plex Mono", fill: "#6A776F" }} axisLine={false} tickLine={false} tickFormatter={(v) => "$" + Math.round(v / 1000) + "k"} />
                  <Tooltip formatter={(v) => money(v)} contentStyle={{ fontFamily: "IBM Plex Mono", fontSize: 11, border: "1px solid #CBD1C9", borderRadius: 0 }} />
                  <Line type="linear" dataKey="nbv" name="Book value" stroke="#EF5A0C" strokeWidth={2} dot={{ r: 2.5, fill: "#EF5A0C" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="notice" style={{ marginTop: 12 }}>
              Book basis only. Tax depreciation runs on a separate schedule — MACRS, Section 179, and bonus rules
              differ from this and belong with your accountant.
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="phead"><h3>Return on this {isBulk ? "SKU" : "unit"}</h3></div>
          <div style={{ padding: 14 }}>
            <dl className="kv">
              <dt>Lifetime rental revenue</dt><dd>{money(item.ltdRev)}</dd>
              <dt>Revenue as % of cost</dt><dd style={{ color: item.ltdRev / d.cost > 1 ? "var(--go)" : "var(--signal)" }}>{Math.round((item.ltdRev / d.cost) * 100)}%</dd>
              <dt>Payback point</dt><dd>{item.ltdRev >= d.cost ? "reached" : money(d.cost - item.ltdRev) + " to go"}</dd>
            </dl>
            <div className="bar" style={{ marginTop: 10 }}>
              <i style={{ width: Math.min(100, (item.ltdRev / d.cost) * 100) + "%", background: item.ltdRev / d.cost > 1 ? "var(--go)" : "var(--signal)" }} />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
