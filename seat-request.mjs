import {parseInvitation} from './invitation-link.mjs';
const config = await (await fetch('./web-config.json', {credentials:'omit',referrerPolicy:'no-referrer'})).json();
const $=id=>document.getElementById(id);
let invite=parseInvitation(location.hash),session=null,profile=null,game=null,venue=null,busy=false,generation=0;
const put=(id,value)=>{$(id).textContent=value;};
// Invitations stay in the fragment. No analytics, query-string tokens, or third-party scripts.
function saveInvitation(){if(invite)sessionStorage.setItem('poker.invitation',location.hash);}
if(!invite && (location.hash.includes('access_token=') || location.search.includes('code=') || location.hash.includes('error='))){
 history.replaceState(null,'',location.pathname+(sessionStorage.getItem('poker.invitation')||''));invite=parseInvitation(location.hash);
 put('web-status','Email confirmation finished. Sign in below to continue.');
}
saveInvitation();
try{session=JSON.parse(sessionStorage.getItem('poker.web.session'));if(!session?.access_token || session.expires_at*1000<=Date.now())session=null;}catch{session=null;}
async function api(path,body,auth=true,method='POST'){
 const headers={'apikey':config.publishable_key,'Content-Type':'application/json'};
 if(auth){if(!session || session.expires_at*1000<=Date.now())throw Error('Your session ended. Sign out below and sign in again.');headers.Authorization='Bearer '+session.access_token;}
 const response=await fetch(config.url+path,{method,headers,body:method==='GET'?undefined:JSON.stringify(body),credentials:'omit',referrerPolicy:'no-referrer'});
 if(!response.ok){if(response.status===429)throw Error('Too many attempts. Please wait a little and try again.');throw Error('Could not complete that step. Check your details, refresh the game, and try again.');}
 const text=await response.text();return text?JSON.parse(text):null;
}
const rpc=(name,body={},auth=true)=>api('/rest/v1/rpc/'+name,body,auth);
async function action(fn){if(busy)return;busy=true;for(const f of document.querySelectorAll('#web-game fieldset'))f.disabled=true;put('web-status','Working…');try{await fn();}catch(e){put('web-status',e.message);}finally{busy=false;for(const f of document.querySelectorAll('#web-game fieldset'))f.disabled=false;}}
async function preview(){
 const own=++generation;$('web-game').hidden=!invite?.game;if(!invite?.game)return;
 try{const p=await rpc('game_link_preview',{p_game_id:invite.game,p_venue_code:invite.venue??null},false);if(own!==generation)return;
 put('web-title',p?.title??'Your game invitation');put('web-details',p?`${new Date(p.starts_at).toLocaleString([], {dateStyle:'full',timeStyle:'short'})} · ${p.area} · ${p.format} · ${p.stakes} · ${p.seats} seats open`:'Sign in to view the game. Private games need the host’s invitation. The game may also have ended or been removed.');
 }catch{put('web-details','Could not load the preview. You can sign in and try opening the game below.');}
 await account();
}
async function account(){
 $('web-auth').hidden=!!session;$('web-account').hidden=!session;$('web-profile').hidden=true;$('web-open').hidden=true;$('web-request').hidden=true;
 if(!session)return;
 try{profile=(await api('/rest/v1/account_profiles?select=*&limit=1',undefined,true,'GET'))[0];$('web-profile').hidden=!!profile;$('web-open').hidden=!profile;put('web-signed-in','Signed in as '+session.user.email);}
 catch{session=null;sessionStorage.removeItem('poker.web.session');$('web-auth').hidden=false;$('web-account').hidden=true;put('web-status','Please sign in again.');}
}
$('web-auth').addEventListener('submit',e=>{e.preventDefault();const mode=e.submitter?.value??'signin';action(async()=>{
 const email=$('web-email').value.trim(),password=$('web-password').value;
 if(mode==='signup'){
  await api('/auth/v1/signup?redirect_to='+encodeURIComponent('https://alexm999911.github.io/poker-finder-info/join.html'),{email,password,gotrue_meta_security:{}},false);put('web-status','Check your email and confirm your account, then return to this invitation and sign in.');$('web-password').value='';return;
 }
 const result=await api('/auth/v1/token?grant_type=password',{email,password},false);
 session={access_token:result.access_token,expires_at:Math.floor(Date.now()/1000)+result.expires_in,user:{id:result.user.id,email:result.user.email}};
 sessionStorage.setItem('poker.web.session',JSON.stringify(session));$('web-password').value='';await account();put('web-status',profile?'Continue to your game below.':'Complete your player profile once to request seats.');
 });});
$('web-signout').addEventListener('click',()=>action(async()=>{try{await api('/auth/v1/logout?scope=local',{});}finally{session=null;profile=null;game=null;venue=null;sessionStorage.removeItem('poker.web.session');await account();put('web-status','Signed out on this browser.');}}));
$('web-profile').addEventListener('submit',e=>{e.preventDefault();action(async()=>{
 await rpc('complete_account_profile',{p_player_name:$('web-name').value.trim(),p_date_of_birth:$('web-dob').value,p_country_code:$('web-country').value,p_confirmed:$('web-age').checked,p_consent_version:1});await account();put('web-status','Profile saved. Continue to the game.');
});});
async function openGame(){
 if(invite.venue)await rpc('join_venue',{p_code:invite.venue});
 const games=await api('/rest/v1/games?id=eq.'+invite.game,undefined,true,'GET');game=games[0];
 if(!game)throw Error('This game is unavailable. Ask the host for a fresh invitation.');
 const previousRevision=venue?.revision;venue=null;if(game.venue_id){const rows=await api('/rest/v1/venue_profiles?id=eq.'+game.venue_id,undefined,true,'GET');venue=rows[0];if(!venue)throw Error('Venue rules could not load. Please refresh.');}
 const requests=await api('/rest/v1/seat_requests?game_id=eq.'+game.id+'&player_id=eq.'+session.user.id,undefined,true,'GET');const mine=requests[0];
 put('web-title',game.title);put('web-details',`${new Date(game.starts_at).toLocaleString()} · ${game.area} · ${game.format} · ${game.stakes} · ${game.seats} seats open`);
 $('web-open').hidden=true;$('web-request').hidden=false;$('web-rules-section').hidden=!venue || !!mine;if(venue?.revision!==previousRevision)$('web-rules-accept').checked=false;put('web-rules',venue?.house_rules??'');$('web-discovery').disabled=venue?.visibility==='invite';if(venue?.visibility==='invite' && $('web-referral').value==='discovery')$('web-referral').value='';
 $('web-request-button').hidden=!!mine || game.owner_id===session.user.id || new Date(game.starts_at)<=new Date();$('web-cancel').hidden=!mine;
 $('web-request-button').textContent=game.seats===0?'Join waitlist':'Request a seat';
 put('web-request-status',mine?`${mine.status==='accepted'?'Confirmed':mine.status==='waitlisted'?'Waitlisted — no confirmed seat':mine.status==='pending'?'Requested — awaiting host confirmation':'Declined'}${mine.seat_number?' · Table seat '+mine.seat_number:''}`:game.owner_id===session.user.id?'You are hosting this game. Manage it in the app.':new Date(game.starts_at)<=new Date()?'This game has started.':'Your seat is confirmed only when the host accepts you.');
 put('web-status','Game refreshed.');
}
$('web-open').addEventListener('click',()=>action(openGame));
$('web-request').addEventListener('submit',e=>{e.preventDefault();action(async()=>{
 if(!game)return;
 if(venue)await rpc('request_venue_seat',{p_game_id:game.id,p_player_name:profile.player_name,p_confirmed:$('web-rules-accept').checked,p_terms_version:1,p_venue_revision:venue.revision,p_referral_source:$('web-referral').value});
 else await rpc('request_seat',{p_game_id:game.id,p_player_name:profile.player_name});
 await openGame();put('web-status','Request saved. Return to this link to check the host’s decision, or open the app for updates.');
});});
$('web-refresh').addEventListener('click',()=>action(openGame));
$('web-cancel').addEventListener('click',()=>{$('web-cancel-confirm').hidden=false;});
$('web-keep').addEventListener('click',()=>{$('web-cancel-confirm').hidden=true;});
$('web-cancel-yes').addEventListener('click',()=>action(async()=>{await rpc('cancel_request',{p_game_id:game.id});$('web-cancel-confirm').hidden=true;await openGame();put('web-status','Your request has been cancelled.');}));
window.addEventListener('hashchange',()=>{invite=parseInvitation(location.hash);saveInvitation();game=null;venue=null;preview();});
preview();
