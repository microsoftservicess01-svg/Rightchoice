
// Helpers: hex <-> bytes
function bytesToHex(bytes){ return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
function hexToBytes(hex){ if(!hex) return new Uint8Array(); const bytes=new Uint8Array(hex.length/2); for(let i=0;i<bytes.length;i++) bytes[i]=parseInt(hex.substr(i*2,2),16); return bytes; }

async function deriveKeyFromPassword(password, saltHex){
  const enc=new TextEncoder();
  const salt=hexToBytes(saltHex);
  const baseKey=await crypto.subtle.importKey('raw', enc.encode(password), {name:'PBKDF2'}, false, ['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:200000, hash:'SHA-256'}, baseKey, {name:'AES-GCM', length:256}, true, ['encrypt','decrypt']);
  return key;
}
async function encryptJSON(key, jsonObj){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const enc=new TextEncoder();
  const data=enc.encode(JSON.stringify(jsonObj));
  const ct=await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, data);
  return { iv: bytesToHex(iv), ciphertext: bytesToHex(ct) };
}

// size & recommendations
function computeSize(band, bust){
  const cmToIn=x=>x/2.54;
  const bandIn=Math.round(cmToIn(band));
  const evenBand=bandIn%2===0?bandIn:bandIn-1;
  const bustIn=Math.round(cmToIn(bust));
  const cupDiff=bustIn-evenBand;
  const cupLetters=['AA','A','B','C','D','DD','E','F'];
  const idx=Math.max(0,Math.min(cupLetters.length-1,cupDiff));
  return `${evenBand}${cupLetters[idx]}`;
}
function recommendStyles(sizeStr, activity, bodyFeatures){
  const recommendations=[];
  if(activity==='sports'){ recommendations.push({style:'High Impact Sports Bra (Encapsulation + Compression)', reason:'Max support, wide straps, high coverage'}); recommendations.push({style:'Racerback Compression', reason:'Minimises bounce for intense workouts'}); }
  else if(activity==='daily'){ recommendations.push({style:'T-Shirt Bra (Moulded Cups)', reason:'Smooth under clothes and light support'}); recommendations.push({style:'Balconette', reason:'Good lift and shape for certain outfits'}); }
  else { recommendations.push({style:'Soft Wireless Bra / Bralette', reason:'Comfort-first, low compression'}); }
  if(bodyFeatures.root==='wide') recommendations.push({style:'Full Coverage with wide side panels', reason:'Better containment for wide roots'});
  return recommendations;
}

// UI bindings
document.addEventListener('DOMContentLoaded', ()=>{
  const band=document.getElementById('band');
  const bust=document.getElementById('bust');
  const activity=document.getElementById('activity');
  const root=document.getElementById('root');
  const passphrase=document.getElementById('passphrase');
  const compute=document.getElementById('compute');
  const reset=document.getElementById('reset');
  const status=document.getElementById('status');
  const resultDiv=document.getElementById('result');

  compute.addEventListener('click', async ()=>{
    try{
      status.textContent='Status: Computing...';
      const b1=Number(band.value), b2=Number(bust.value);
      if(!b1||!b2){ status.textContent='Status: Enter numeric measurements'; return; }
      const size=computeSize(b1,b2);
      const recs=recommendStyles(size, activity.value, {root: root.value});
      resultDiv.innerHTML=`<div><strong>Estimated Size:</strong> ${size}</div><div style="margin-top:8px"><strong>Recommendations:</strong><ul>${recs.map(r=>`<li><strong>${r.style}</strong> — ${r.reason}</li>`).join('')}</ul></div>`;
      status.textContent='Status: Preparing encrypted download';

      const payload={ timestamp:new Date().toISOString(), band:b1, bust:b2, size, activity:activity.value, bodyFeatures:{root:root.value}, recommendations:recs };
      const salt=bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
      const key=await deriveKeyFromPassword(passphrase.value||'demo-pass', salt);
      const enc=await encryptJSON(key, payload);
      const packaged={ salt, iv:enc.iv, ct:enc.ciphertext };
      const blob=new Blob([JSON.stringify(packaged)], {type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=`brafit-encrypted-${Date.now()}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      status.textContent='Status: Done (downloaded encrypted file).';
    }catch(e){
      console.error(e);
      status.textContent='Status: Error - '+e.message;
    }
  });

  reset.addEventListener('click', ()=>{ band.value=''; bust.value=''; passphrase.value=''; resultDiv.innerHTML=''; status.textContent='Status: Ready'; });
});
