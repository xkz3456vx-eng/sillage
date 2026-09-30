(function(S){
  'use strict';
  const U=S.util;let control=null,renderTimer;
  function stats(points,options={speed:15},profile='touring'){
    const cum=U.cumulative(points),distance=cum[cum.length-1]||0;
    let ascent=0,descent=0,anchor=null,min=Infinity,max=-Infinity,known=0;const surfaces={road:0,gravel:0,trail:0,unknown:0};
    // 3 m hysteresis limits noise in dense GPX recordings. Missing altitudes
    // reset the accumulator; never replace them by sea level.
    for(let i=0;i<points.length;i++){
      const p=points[i];if(i&&!p.break)surfaces[p.surface in surfaces?p.surface:'unknown']+=cum[i]-cum[i-1];
      if(!Number.isFinite(p.ele)){anchor=null;continue;}
      known++;min=Math.min(min,p.ele);max=Math.max(max,p.ele);
      if(anchor===null||p.break)anchor=p.ele;
      const delta=p.ele-anchor;if(Math.abs(delta)>=3){if(delta>0)ascent+=delta;else descent-=delta;anchor=p.ele;}
      if((i===points.length-1||points[i+1]?.break)&&Math.abs(p.ele-anchor)>0){const tail=p.ele-anchor;if(tail>0)ascent+=tail;else descent-=tail;}
    }
    const elevationKnown=known>0,coverage=points.length?known/points.length:0;
    const climbing=distance?ascent/(distance/1000):0,rough=distance?surfaces.trail/distance:0;
    let difficulty=distance===0?'À dessiner':rough>.3||climbing>25?'Difficile':rough>.08||climbing>12?'Modéré':'Facile';
    if(distance&&(!elevationKnown||surfaces.unknown/distance>.5))difficulty='À vérifier';
    const hours=distance/1000/Math.max(1,options.speed)+(elevationKnown?ascent/(['hiking','accessible'].includes(profile)?600:1100):0);
    return {distance,cum,ascent,descent,min:elevationKnown?min:null,max:elevationKnown?max:null,elevationKnown,coverage,surfaces,climbing,difficulty,hours};
  }
  S.elevation={stats,current:null,
    update(){
      const st=S.app.state,points=st.route?.points||[];this.current=stats(points,st.options,st.profile);S.ui.renderStats(this.current);this.render();
    },
    render(){
      const host=document.getElementById('elevation-chart');if(!host||!S.map.instance)return;
      if(control){control._mouseoutHandler?.();control.remove();control=null;}
      host.replaceChildren();
      const points=S.app.state.route?.points||[];
      if(points.length<2||!this.current?.elevationKnown){host.innerHTML='<div class="chart-empty">'+(points.length?'Aucune altitude disponible dans cette trace':'Dessinez un parcours pour explorer son relief')+'</div>';return;}
      if(document.getElementById('elevation-wrap').hidden)return;
      const imperial=S.app.state.settings.units==='imperial',step=Math.max(1,Math.ceil(points.length/1800));
      const entries=[];for(let i=0;i<points.length;i++)if(i%step===0||i===points.length-1||points[i].break||points[i+1]?.break)entries.push({p:points[i],index:i});
      control=L.control.elevation({theme:'sillage-elevation',width:host.clientWidth||600,height:host.clientHeight||104,margins:{top:8,right:18,bottom:20,left:42},xTicks:5,yTicks:3,collapsed:false,imperial,useHeightIndicator:false});
      // Adapter for the vendored 0.0.4-d3v4 plugin: keep true cumulative distances,
      // missing elevation gaps and our original SVG circle marker (no vendor icon).
      control._mousemoveHandler=function(){if(!this._data?.length)return;const x=U.clamp(d3.mouse(this._background.node())[0],0,this._width());const i=U.clamp(this._findItemForX(x),0,this._data.length-1);const item=this._data[i];if(item&&Number.isFinite(item.altitude)){this._showDiagramIndicator(item,this._x(item.dist));S.map.cursor(item.latlng);}};
      const originalShow=control._showDiagramIndicator;
      control._showDiagramIndicator=function(item,x){if(!Number.isFinite(item.altitude))return;originalShow.call(this,item,x);document.getElementById('elevation-cursor').textContent=`${item.dist.toFixed(1)} ${imperial?'mi':'km'} · ${Math.round(item.altitude)} ${imperial?'ft':'m'}`;};
      control.addTo(S.map.instance);host.append(control.getContainer());
      const data=entries.map(({p,index})=>({dist:this.current.cum[index]/1000*(imperial?.621371:1),altitude:Number.isFinite(p.ele)?p.ele*(imperial?3.28084:1):null,latlng:L.latLng(p.lat,p.lng),x:p.lng,y:p.lat,break:p.break,index}));
      control._data=data;control._area.defined(d=>Number.isFinite(d.altitude)&&!d.break);control._applyData();
      if(this.current.max===this.current.min){control._y.domain([data.find(x=>x.altitude!==null).altitude-1,data.find(x=>x.altitude!==null).altitude+1]);control._areapath.attr('d',control._area);control._updateAxis();}
      host.onmouseleave=()=>S.map.hideCursor();let keyIndex=0;
      host.onkeydown=e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();keyIndex=U.clamp(keyIndex+(e.key==='ArrowRight'?1:-1),0,data.length-1);const item=data[keyIndex];control._showDiagramIndicator(item,control._x(item.dist));S.map.cursor(item.latlng);};
    },
    hover(latlng){if(control?._data?.length){control._handleLayerMouseOver({latlng});S.map.cursor(latlng);}},
    resize(){clearTimeout(renderTimer);renderTimer=setTimeout(()=>this.render(),180);},
    stages(){
      const st=S.app.state,points=st.route?.points||[];if(points.length<2)return [];
      const cum=this.current?.cum||U.cumulative(points);
      const ends=st.stages.map(p=>({...U.nearest(p,points,cum),id:p.id})).filter(x=>x.index>0&&x.index<points.length-1).sort((a,b)=>a.along-b.along);
      ends.push({index:points.length-1,id:'end'});let from=0;
      return ends.map((end,i)=>{const m=stats(points.slice(from,end.index+1),st.options,st.profile);from=end.index;return {...m,id:end.id,day:i+1,end:points[end.index]};});
    }
  };
})(Sillage);
