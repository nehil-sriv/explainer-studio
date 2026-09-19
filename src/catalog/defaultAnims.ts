/** Per-type default entrance (verbatim from index.html TK_DEFAULT_ANIM). */
export const TK_DEFAULT_ANIM: Record<string, string> = {
  kicker:'pa-fade', title:'pa-glitchin', terminal:'pa-up', hottake:'pa-up', toast:'pa-down', bullets:'pa-left',
  blame:'pa-left', comment:'pa-left', stamp:'pa-zoom', sticky:'pa-zoomout', loopbox:'pa-fade',
  box:'pa-fade', caption:'pa-up', progress:'pa-fade', rec:'pa-zoom', diff:'pa-fade',
  checklist:'pa-up', arrow:'pa-fade', circle:'pa-fade', rect:'pa-fade', ellipse:'pa-fade', verdict:'pa-zoom', image:'pa-fade', callout:'pa-fade', code:'pa-up',
  versus:'pa-up', myth:'pa-left', proscons:'pa-up', matrix:'pa-fade', tiers:'pa-left', quotecard:'pa-zoom', beforeafter:'pa-left',
  info:'pa-left', alert:'pa-down', success:'pa-zoom', popup:'pa-zoom', textbg:'pa-fade', lower3rd:'pa-up', quote:'pa-left',
  user:'pa-right',
  svc:'pa-left', gnode:'pa-up', server:'pa-up', vm:'pa-up', container:'pa-zoom', pod:'pa-up', bootnode:'pa-up',
  controlplane:'pa-glitchin', boundary:'pa-zoom', lb:'pa-fade', gateway:'pa-left', cdn:'pa-zoom',
  lambda:'pa-zoom', worker:'pa-up', firewall:'pa-left', cloud:'pa-zoom', crashpod:'pa-down', swarm:'pa-fade',
  db:'pa-up', nosql:'pa-up', cache:'pa-zoom', queue:'pa-left', bucket:'pa-up', warehouse:'pa-up',
  doc:'pa-fade', logs:'pa-left', kv:'pa-fade', stream:'pa-fade', gauge:'pa-fade',
  embed:'pa-zoom', vdb:'pa-up', model:'pa-zoom', tokens:'pa-fade', prompt:'pa-left', ctxwin:'pa-fade',
  splitter:'pa-fade', index:'pa-up',
  wire:'pa-fade', packet:'pa-fade', arcwire:'pa-fade', fanout:'pa-fade', elbow:'pa-fade', ws:'pa-fade',
  retry:'pa-fade', timeout:'pa-down', valve:'pa-fade', pipeline:'pa-left', breaker:'pa-fade', consensus:'pa-zoom',
  fproc:'pa-left', fdec:'pa-zoom', fterm:'pa-zoom', fio:'pa-left',
  k8s:'pa-zoom', alarm:'pa-down', cron:'pa-fade', globe:'pa-zoom', secret:'pa-fade', policy:'pa-zoom',
  repo:'pa-left', cirunner:'pa-zoom',
  lifeline:'pa-fade', activation:'pa-zoom', selfcall:'pa-fade',
  dtitle:'pa-down', legend:'pa-fade', footnote:'pa-fade', frame:'pa-fade', timeline:'pa-left',
  chartline:'pa-fade', chartbars:'pa-left', chartdonut:'pa-zoom',
  candles:'pa-fade', stquote:'pa-up', ticker:'pa-left', waterfall:'pa-left', allocdonut:'pa-zoom',
  sipcalc:'pa-up', riskdial:'pa-zoom', disclaimer:'pa-down', earnings:'pa-left', heatgrid:'pa-fade', emicalc:'pa-up',
  clientdev:'pa-right',
  kcp:'pa-glitchin', knode:'pa-up',
  chip:'pa-fade', countbadg:'pa-zoom', latency:'pa-fade', lock:'pa-zoom',
  plate:'pa-left', region:'pa-fade', replicate:'pa-fade', scale:'pa-fade',
  health:'pa-fade', warn:'pa-zoom', burst:'pa-down', spinner:'pa-fade'
};;

/** Resolve the entrance for a take: explicit anim wins, type default next. */
export function defaultAnimFor(type: string): string {
  return TK_DEFAULT_ANIM[type] || 'none';
}

export function resolveAnim(type: string, anim: string | undefined): string {
  if (anim !== undefined) return anim;
  return defaultAnimFor(type);
}
