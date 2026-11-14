export function whatsappLink(phone:string):string|null{
 const raw=phone.trim();if(!/^[+\d\s().-]+$/.test(raw))return null;
 let digits=raw.replace(/\D/g,'');if(digits.startsWith('00'))digits=digits.slice(2);
 if(digits.length===8)digits='506'+digits;
 if(!/^[1-9]\d{9,14}$/.test(digits))return null;
 return `https://wa.me/${digits}`;
}
