const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseInvitation(fragment) {
  if (!fragment || fragment.length > 100) return null;
  const pairs = fragment.replace(/^#/, '').split('&');
  const values = {};
  for (const pair of pairs) {
    const [key, value, extra] = pair.split('=');
    if (extra !== undefined || !['v','g'].includes(key) || key in values || !guid.test(value ?? '') || /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(value)) return null;
    values[key] = value.toLowerCase();
  }
  if (!values.v && !values.g) return null;
  return { venue: values.v, game: values.g, appLink: 'com.omniabi.pokerfinder://invite/#' + ['v','g'].filter(k=>values[k]).map(k=>k+'='+values[k]).join('&') };
}
export function validTestFlight(url) { return typeof url==='string' && /^https:\/\/testflight\.apple\.com\/join\/[A-Za-z0-9]{8}$/.test(url); }
export function validAndroid(url) { return typeof url==='string' && /^https:\/\/github\.com\/AlexM999911\/poker-finder-info\/releases\/download\/android-\d+\.\d+\.\d+\/PokerFinder-\d+\.\d+\.\d+\.apk$/.test(url); }
