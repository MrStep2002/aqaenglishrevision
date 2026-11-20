// World positions stay fixed. Only the camera moves as Scrooge explores.
export const pitch = 128;
export const signY = 77;
export const ground = 140;
export const goal = 10;
const jumpSeconds = .96;
export const wreathRadius = word => Math.min(53, Math.max(22, 7 + word.length * 3.1));

export class FredsOrDeadCourse {
  constructor(rounds, words) {
    this.rounds = rounds;
    this.houses = words.map(word => ({ word, collected: false }));
    this.targets = rounds.map(entry => this.houses.findIndex(house => house.word.toLowerCase() === entry.word.toLowerCase()));
    this.homeIndex = this.houses.length;
    this.firstHouseX = pitch;
    this.worldX = 40;
    this.distance = 0;
    this.walked = 0;
    this.score = 0;
    this.airTime = 0;
    this.airborne = false;
    this.facing = 1;
    this.moving = false;
    this.state = 'running';
    this.sceneTime = 0;
    this.flashTime = 0;
  }
  get playerX() { return this.worldX - this.distance; }
  get homeX() { return this.firstHouseX + this.homeIndex * pitch; }
  get partyReady() { return this.score === this.rounds.length; }
  setWidth(width) {
    this.width = width;
    this.follow();
  }
  follow() {
    const width = this.width || 320;
    const end = Math.max(0, this.homeX + pitch * .5 - width);
    this.distance = Math.max(0, Math.min(end, this.worldX - width * .45));
  }
  houseX(index) { return this.firstHouseX + index * pitch - this.distance; }
  houseAt(index) {
    const house = this.houses[index];
    return house?.collected ? undefined : house;
  }
  get jumpHeight() {
    if (!this.airborne) return 0;
    const t = this.airTime / jumpSeconds;
    return 4 * 47 * t * (1 - t);
  }
  jump() {
    if (this.state !== 'running' || this.airborne) return;
    this.airborne = true;
    this.caughtThisJump = false;
    this.airTime = 0;
  }
  advanceJump(dt) {
    if (!this.airborne) return;
    this.airTime = Math.min(this.airTime + dt, jumpSeconds);
    if (this.airTime === jumpSeconds) this.airborne = false;
  }
  collect(index) {
    this.houses[index].collected = true;
    this.score++;
    this.flashKind = 'good';
    return 'score';
  }
  tick(dt, direction = 0) {
    if (this.state === 'arriving') {
      this.sceneTime = Math.min(1, this.sceneTime + dt / 1.5);
      this.worldX = this.arrivalFrom + (this.homeX - this.arrivalFrom) * Math.min(1, this.sceneTime / .6);
      this.follow();
      if (this.sceneTime === 1) { this.state = 'won'; return 'won'; }
      return;
    }
    if (this.state !== 'running') return;
    this.advanceJump(dt);
    this.flashTime = Math.max(0, this.flashTime - dt);
    this.moving = false;
    if (direction) {
      this.facing = Math.sign(direction);
      const end = this.partyReady ? this.homeX + 24 : this.homeX - 24;
      const next = Math.max(16, Math.min(end, this.worldX + Math.sign(direction) * 145 * dt));
      this.walked += Math.abs(next - this.worldX);
      this.moving = next !== this.worldX;
      this.worldX = next;
      this.follow();
    }
    const atDoor = this.worldX >= this.homeX - 25;
    if (this.partyReady && Math.abs(this.worldX - this.homeX) < 18 && this.jumpHeight < 8) {
      this.state = 'arriving';
      this.sceneTime = 0;
      this.arrivalFrom = this.worldX;
      this.moving = false;
      return 'enter';
    }
    const locked = atDoor && !this.partyReady && !this.atDoor;
    this.atDoor = atDoor;
    if (locked) return 'locked';
    if (this.partyReady || this.caughtThisJump || this.jumpHeight < ground - 26 - signY - 5) return;
    const handX = this.worldX + this.facing * 7;
    const index = Math.round((handX - this.firstHouseX) / pitch);
    const house = this.houseAt(index);
    if (house && Math.abs(this.firstHouseX + index * pitch - handX) <= wreathRadius(house.word) + 2) {
      this.caughtThisJump = true;
      this.flashIndex = index;
      this.flashTime = .7;
      if (index === this.targets[this.score]) return this.collect(index);
      this.flashKind = 'wrong';
      return 'wrong';
    }
  }
}
