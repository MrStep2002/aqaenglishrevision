import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import readBank from './read-serve-your-sentence-bank.js';
import readCsv from './read-csv.js';
import vocabularyBank from '../src/_data/vocabularyBank.js';

const filename = new URL('../src/assets/data/christmas-carol-serve-your-sentence.csv',import.meta.url);
const csv = readFileSync(filename,'utf8');
const [header,...rows] = readCsv(csv).filter(row=>row.some(Boolean));
const bank = JSON.parse(readBank());
const field = name => header.indexOf(name);
const write = data => data.map(row=>row.map(value=>'"'+value.replaceAll('"','""')+'"').join(',')).join('\n')+'\n';
function changedRow(id,updates) {
  const data=[header,...rows.map(row=>[...row])];
  const row=data.find(row=>row[field('id')]===id);
  for(const[name,value]of Object.entries(updates))row[field(name)]=value;
  return write(data);
}

test('Level 1 has 80 short sentences with single-word authored choices and evidence after the gap',()=>{
  const easy=bank.filter(item=>item.level===1);
  assert.equal(easy.length,80);
  for(const item of easy){
    assert.equal(item.choices.length,4);
    assert.equal(new Set(item.choices.map(word=>word.toLowerCase())).size,4);
    assert(item.choices.every(word=>/^\p{L}+$/u.test(word)),item.id);
    assert(item.example.split(/\s+/u).length<=20,item.id);
    assert.equal(item.example.slice(item.start,item.start+item.length).toLowerCase(),item.word);
    assert(item.start/item.example.length<0.6,item.id);
    assert(item.example.slice(item.start+item.length).trim().split(/\s+/u).length>=5,item.id);
  }
});

test('all 100 existing examples and definitions survive, with the former easy examples moved to Level 2',()=>{
  const old=JSON.parse(vocabularyBank());
  assert.equal(bank.length,180);
  assert.deepEqual([1,2,3].map(level=>bank.filter(item=>item.level===level).length),[80,78,22]);
  old.forEach((item,index)=>{
    const current=bank.find(row=>row.id==='sys-legacy-'+String(index+1).padStart(3,'0'));
    assert(current);
    for(const key of ['word','definition','example','start','length'])assert.equal(current[key],item[key]);
    assert.equal(current.level,item.level===1?2:item.level);
    assert(!current.choices,'Existing middle/hard behaviour changed');
  });
});

test('a repeated answer can have a different sentence without collapsing the question deck',()=>{
  const hope=bank.filter(item=>item.level===1&&item.word==='hope');
  assert.equal(hope.length,2);
  assert.notEqual(hope[0].id,hope[1].id);
  assert.notEqual(hope[0].example,hope[1].example);
});

test('Level 1 cannot silently fall back to random alternatives',()=>{
  assert.throws(()=>readBank(changedRow('sys-1-001',{wrong1:'',wrong2:'',wrong3:''})),/Level 1 needs/);
});

test('reject partial sets, duplicate choices and multiword Level 1 alternatives',()=>{
  assert.throws(()=>readBank(changedRow('sys-1-001',{wrong3:''})),/Level 1 needs/);
  assert.throws(()=>readBank(changedRow('sys-1-001',{wrong3:'CERTAINTY'})),/distinct single-word/);
  assert.throws(()=>readBank(changedRow('sys-1-001',{wrong3:'great fear'})),/single-word/);
});

test('reject missing or repeated gap answers and duplicate question IDs',()=>{
  assert.throws(()=>readBank(changedRow('sys-1-001',{example:'The narrator explains that Marley is dead.'})),/exactly once/);
  assert.throws(()=>readBank(changedRow('sys-1-001',{example:'The narrator creates certainty and more certainty.'})),/exactly once/);
  assert.throws(()=>readBank(changedRow('sys-1-001',{id:'sys-1-002'})),/unique id and sentence/);
});
