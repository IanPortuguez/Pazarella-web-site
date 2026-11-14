import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCart} from '../lib/cart-storage.ts';
import {constantTimeEqual,passwordHash,randomToken,tokenHash} from '../lib/password.ts';
test('cart accepts only references and quantities, stripping personal data and forged prices',()=>{
 assert.deepEqual(parseCart(JSON.stringify([{id:1,color:'Vino',size:'M',qty:2,price:1,password:'fake',email:'private'}])),[{id:1,color:'Vino',size:'M',qty:2}]);
});
test('invalid or oversized browser storage cannot become a valid cart',()=>{
 for(const value of ['{','null','{}','x'.repeat(16001),JSON.stringify(Array(31).fill({id:1,color:'N',size:'S',qty:1}))])assert.deepEqual(parseCart(value),[]);
 assert.deepEqual(parseCart(JSON.stringify([{id:1,color:'N',size:'S',qty:-1},{id:2,color:'N',size:'S',qty:1.5}])),[]);
 const item={id:1,color:'N',size:'S',qty:2};assert.equal(parseCart(JSON.stringify([item,item])).length,1);
});
test('password hashes require the correct password, salt and server pepper',async()=>{
 const pepper='server-only-test-secret'.repeat(2),hash=await passwordHash('a-long-test-password','salt-a',pepper);
 assert.ok(constantTimeEqual(hash,await passwordHash('a-long-test-password','salt-a',pepper)));
 assert.notEqual(hash,await passwordHash('wrong-password','salt-a',pepper));
 assert.notEqual(hash,await passwordHash('a-long-test-password','salt-b',pepper));
 assert.notEqual(hash,await passwordHash('a-long-test-password','salt-a',pepper+'different'));
 await assert.rejects(passwordHash('password','salt',''));
});
test('sessions use unpredictable tokens and store only their hash',async()=>{
 const a=randomToken(),b=randomToken();assert.match(a,/^[0-9a-f]{64}$/);assert.notEqual(a,b);
 assert.notEqual(await tokenHash(a),a);assert.notEqual(await tokenHash(a),await tokenHash(b));
 assert.equal(await tokenHash(a),await tokenHash(a));
});

import jpeg from 'jpeg-js';
import {sanitizeProductImage} from '../lib/image-upload.ts';
import {hasPermission,validPermissions} from '../lib/permissions.ts';
test('images are decoded and regenerated; forged signatures and appended payload are rejected or removed',()=>{
 const jpegBytes=jpeg.encode({width:1,height:1,data:new Uint8Array([255,255,255,255])},85).data;
 const original=Buffer.concat([jpegBytes,Buffer.from('APPENDED_PRIVATE_PAYLOAD')]);
 const clean=sanitizeProductImage(original);assert.equal(Buffer.from(clean).includes(Buffer.from('APPENDED_PRIVATE_PAYLOAD')),false);
 assert.throws(()=>sanitizeProductImage(new Uint8Array([255,216,255])));assert.throws(()=>sanitizeProductImage(new Uint8Array(3000001)));
});
test('permissions are explicit and owner capabilities cannot be granted through a permission string',()=>{
 assert.deepEqual(validPermissions(['orders.manage']),['orders.manage','orders.read']);assert.equal(validPermissions(['owner']),null);
 assert.equal(hasPermission({id:'x',username:'staff',role:'staff',permissions:['orders.read']},'orders.manage'),false);
 assert.equal(hasPermission({id:'x',username:'owner',role:'owner',permissions:[]},'inventory.manage'),true);
});
