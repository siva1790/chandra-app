import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { getBirthInstant, getBirthMoonProfile } from '../src/profileMessages.js'

test('Indian birth clock times resolve to exact UTC instants, including date rollover', () => {
  const cases = [
    ['1990-01-01', '00:00', '1989-12-31T18:30:00.000Z'],
    ['2000-02-29', '05:30', '2000-02-29T00:00:00.000Z'],
    ['2000-02-29', '23:59', '2000-02-29T18:29:00.000Z'],
    ['2026-06-15', '10:45', '2026-06-15T05:15:00.000Z'],
  ]
  for (const [dob, birthTime, instant] of cases) {
    const profile = Object.freeze({ dob, birthTime })
    assert.equal(getBirthInstant(profile).toISOString(), instant)
    assert.equal(profile.dob, dob)
    assert.equal(profile.birthTime, birthTime)
  }
})

test('invalid or incomplete saved birth fields cannot silently normalize to another instant', () => {
  for (const profile of [
    undefined, {}, { dob: '2000-01-01' }, { birthTime: '12:00' },
    { dob: '2026-02-30', birthTime: '12:00' },
    { dob: '1900-02-29', birthTime: '12:00' },
    { dob: '2000-13-01', birthTime: '12:00' },
    { dob: '2000-1-01', birthTime: '12:00' },
    ...['24:00', '12:60', '9:00', '12:00Z', ''].map(birthTime => ({ dob: '2000-01-01', birthTime })),
  ]) {
    assert.equal(getBirthInstant(profile), null)
    assert.equal(getBirthMoonProfile(profile), null)
  }
})

test('saved profiles and personalized Moon results are invariant across device timezones', () => {
  const script = `import {getBirthInstant,getBirthMoonProfile,buildPersonalMyDayMessage} from './src/profileMessages.js';
    const profiles = [
      {dob:'1990-01-01',birthTime:'00:00'},
      {dob:'2000-02-29',birthTime:'23:59'},
      {dob:'2026-03-08',birthTime:'02:30'},
      {dob:'2026-06-15',birthTime:'10:45'},
      {dob:'2026-11-01',birthTime:'01:30'}
    ];
    console.log(JSON.stringify(profiles.map(profile => {
      const birthProfile=getBirthMoonProfile(profile);
      return {instant:getBirthInstant(profile).toISOString(),birthProfile,message:buildPersonalMyDayMessage({
        tithi:{name:'Ekadashi',paksha:'Shukla'},vara:'Somvar',nakshatra:'Rohini',highlight:{},birthProfile,name:'Test'
      })};
    })))`
  const outputs = ['Asia/Kolkata', 'UTC', 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'Pacific/Auckland']
    .map(TZ => execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      env: { ...process.env, TZ }, encoding: 'utf8',
    }))
  for (const output of outputs) assert.equal(output, outputs[0])
})

test('the fix preserves existing results for devices already using IST', () => {
  const script = `import assert from 'node:assert/strict';
    import {getBirthInstant} from './src/profileMessages.js';
    for(const [dob,birthTime] of [['1990-01-01','00:00'],['2000-02-29','23:59'],['2026-06-15','10:45']]) {
      const oldInstant=new Date(dob+'T'+birthTime+':00');
      assert.equal(getBirthInstant({dob,birthTime}).getTime(),oldInstant.getTime());
    }`
  execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: 'Asia/Kolkata' } })
})
