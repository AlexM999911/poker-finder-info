import {parseInvitation, validTestFlight, validAndroid} from './invitation-link.mjs';
const $=id=>document.getElementById(id);
function showInvitation(){
  const invite=parseInvitation(location.hash);
  $('open-invite').hidden=!invite;$('manual-invite').hidden=!invite?.venue;
  $('invite-status').textContent=invite?'Your host’s invitation is ready. Open it after installing the app.':'There is no valid invitation in this link. Ask your host to share a fresh game invitation; you can still use the install instructions above.';
  $('open-invite').removeAttribute('href');$('venue-code').value='';
  if(invite){$('open-invite').href=invite.appLink;if(invite.venue)$('venue-code').value=invite.venue;}
}
showInvitation();window.addEventListener('hashchange',showInvitation);
$('copy-code').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('venue-code').value);$('copy-status').textContent='Code copied. Paste it in the app’s Venues tab.';}catch{$('venue-code').focus();$('venue-code').select();$('copy-status').textContent='Select and copy the code above.';}});
// Invitation fragments never enter this request, a server lookup or analytics.
async function distribution(){
 try{
  const r=await fetch('./beta-distribution.json',{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)throw Error();const d=await r.json();
  $('ios-status').textContent=validTestFlight(d.ios?.url)?'Install TestFlight, then join the Poker Finder beta below.':'Public iPhone invitations are not open yet. Apple beta approval is required. Existing invited testers can continue using TestFlight.';
  if(validTestFlight(d.ios?.url)){$('ios-link').href=d.ios.url;$('ios-link').hidden=false;}
  if(validAndroid(d.android?.url) && /^[a-f0-9]{64}$/.test(d.android?.sha256 ?? '')){
   $('android-status').textContent='Android beta '+d.android.version+' is ready to download.';$('android-link').href=d.android.url;$('android-link').hidden=false;
   $('android-version').textContent=d.android.version;$('android-hash').textContent=d.android.sha256;$('android-details').hidden=false;
  }else $('android-status').textContent='The signed Android download is being prepared. Ask your host for availability.';
 }catch{$('ios-status').textContent='Could not check iPhone beta availability. Ask your host for the current TestFlight invitation.';$('android-status').textContent='Could not check the Android download. Refresh this page or ask your host.';}
}
distribution();
