// Keyboard input with edge detection (press-once) and held-state queries.
export const MAP_P1 = {
  left:'KeyA', right:'KeyD', up:'KeyW', down:'KeyS',
  light:'KeyJ', heavy:'KeyK', special:'KeyL', rush:'KeyO',
  charge:'KeyU', block:'KeyI', jump:'Space', trans:'KeyT', ult:'KeyP',
};
export const MAP_P2 = {
  left:'ArrowLeft', right:'ArrowRight', up:'ArrowUp', down:'ArrowDown',
  light:'Numpad1', heavy:'Numpad2', special:'Numpad3', rush:'Numpad6',
  charge:'Numpad0', block:'NumpadDecimal', jump:'ShiftRight', trans:'Numpad5', ult:'Numpad9',
};

export class Input {
  constructor(){
    this.keys = {};
    this._edge = {};
    this._metaCallbacks = [];
    this._kd = (e)=>{
      this.keys[e.code] = true;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
      this._metaCallbacks.forEach(cb=>cb(e.code));
    };
    this._ku = (e)=>{ this.keys[e.code] = false; };
    window.addEventListener('keydown', this._kd);
    window.addEventListener('keyup', this._ku);
  }
  onMeta(cb){ this._metaCallbacks.push(cb); }
  down(code){ return !!this.keys[code]; }
  // edge: true only on the frame the key transitions to pressed
  pressed(id, code){
    const now = !!this.keys[code];
    const was = this._edge[id];
    this._edge[id] = now;
    return now && !was;
  }
  dispose(){
    window.removeEventListener('keydown', this._kd);
    window.removeEventListener('keyup', this._ku);
  }
}
