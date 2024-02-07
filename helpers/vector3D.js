class Vector3D {
  constructor({
    x: t,
    y: s,
    z: r
  }) {
    this.x = t, this.y = s, this.z = r;
  }
  normalize() {
    return {
      x: this.x || 0,
      y: this.y || 0,
      z: this.z || 0
    };
  }
}

module.exports = {
  Vector3D: Vector3D
};