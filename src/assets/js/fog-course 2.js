// The runner, scrolling houses and collisions share the canvas's pixel coordinates.
export const pitch = 128;
export const signY = 77;
export const ground = 140;
export const goal = 10;
const jumpSeconds = .96;
export const wreathRadius = word => Math.min(53, Math.max(22, 7 + word.length * 3.1));

export class FogCourse {
  constructor(rounds) {
    this.rounds = rounds;
    this.score = 0;
    this.houses = [];
    this.targets = rounds.map(round => {
      const target = round.houses.findIndex(house => house.correct);
      this.houses.push(...round.houses.slice(0,target + 1));
      return this.houses.length - 1;
    });
    this.homeIndex = this.houses.length;
    this.distance = 0;
    this.airTime = 0;
    this.airborne = false;
    this.facing = 1;
    this.state = 'running';
    this.sceneTime = 0;
    this.readTime = rounds[0].readTime;
  }
  setWidth(width) {
    if (!this.width) {
      this.playerX = Math.min(width * .23, 92);
      this.firstHouseX = this.playerX + 110;
    }
    this.width = width;
    this.playerX = this.boundX(this.playerX);
  }
  boundX(x) { return Math.max(10, Math.min(this.width - 10, x)); }
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
  caught(reason, house) {
    this.reason = reason;
    this.failedHouse = house;
    this.state = 'abducting';
    this.sceneTime = 0;
    return reason;
  }
  collect(index) {
    this.caughtThisJump = true;
    this.score++;
    this.houses[index].collected = true;
    if (this.score === this.rounds.length) {
      this.state = 'arriving';
      this.sceneTime = 0;
      this.homeIndex = index + 1;
      this.arrivalFrom = this.distance;
      this.arrivalDistance = this.houseX(this.homeIndex) - this.boundX(this.playerX + 43);
    } else {
      this.readTime = this.rounds[this.score].readTime;
      // A small edited word bank can repeat an answer from an earlier round.
      this.houses[this.targets[this.score]].collected = false;
    }
    return 'score';
  }
  tick(dt, direction = 0) {
    if (this.state === 'abducting') {
      this.sceneTime = Math.min(1, this.sceneTime + dt / 1.65);
      if (this.sceneTime === 1) { this.state = 'lost'; return 'lost'; }
      return;
    }
    if (this.state === 'arriving') {
      this.advanceJump(dt);
      this.sceneTime = Math.min(1, this.sceneTime + dt / 2.5);
      const approach = Math.min(1, this.sceneTime / .72);
      this.distance = this.arrivalFrom + this.arrivalDistance * (1 - (1 - approach) ** 2);
      if (this.sceneTime === 1) { this.state = 'won'; return 'won'; }
      return;
    }
    if (this.state !== 'running') return;
    this.advanceJump(dt);
    if (direction) {
      this.facing = Math.sign(direction);
      this.playerX = this.boundX(this.playerX + this.facing * 130 * dt);
    }
    this.distance += dt * (this.readTime > 0 ? 36 : 76 + this.score);
    this.readTime = Math.max(0, this.readTime - dt);
    const target = this.targets[this.score];
    const answer = this.houses[target];
    // A missed wreath counts only when its outer leaves have cleared the screen.
    if (this.houseX(target) + wreathRadius(answer.word) + 5 < 0) {
      return this.caught('missed', answer);
    }
    if (this.caughtThisJump || this.jumpHeight < ground - 26 - signY - 5) return;
    const handX = this.playerX + this.facing * 7;
    const index = Math.round((handX - this.houseX(0)) / pitch);
    const house = this.houseAt(index);
    if (house && Math.abs(this.houseX(index) - handX) <= wreathRadius(house.word) + 2) {
      // Any visible copy of the answer earns the point, including on a return run.
      return house.word === answer.word ? this.collect(index) : this.caught('wrong', house);
    }
  }
}
