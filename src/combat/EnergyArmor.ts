/** Regenerating energy armor absorbs damage before the physical hull. */
export class EnergyArmor {
  readonly maxIntegrity=200;
  readonly maxHull=1000;
  integrity=this.maxIntegrity;
  hull=this.maxHull;
  recoveryDelay=0;
  collapsed=false;
  reforming=false;
  get active():boolean {return !this.collapsed&&this.integrity>0&&this.hull>0;}
  hit(damage:number):{absorbed:number; hullDamage:number; broke:boolean} {
    if(damage<=0||!Number.isFinite(damage)||this.hull<=0)return {absorbed:0,hullDamage:0,broke:false};
    const absorbed=this.active?Math.min(this.integrity,damage*.94):0;
    this.integrity-=absorbed;const hullDamage=damage-absorbed;this.hull=Math.max(0,this.hull-hullDamage);
    const broke=!this.collapsed&&this.integrity<=1e-8;
    if(broke){this.integrity=0;this.collapsed=true;}
    this.recoveryDelay=this.collapsed?4:2.5;
    return {absorbed,hullDamage,broke};
  }
  update(dt:number):void {
    this.reforming=false;if(this.hull<=0)return;
    const available=Math.max(0,dt-this.recoveryDelay);this.recoveryDelay=Math.max(0,this.recoveryDelay-dt);
    this.integrity=Math.min(this.maxIntegrity,this.integrity+available*32);
    if(this.collapsed&&this.integrity>=50){this.collapsed=false;this.reforming=true;}
  }
  reset():void {this.integrity=this.maxIntegrity;this.hull=this.maxHull;this.recoveryDelay=0;this.collapsed=this.reforming=false;}
}
