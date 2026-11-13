'use client';
export default function VideoWorkflowTabs({active,onChange}) {
  return <nav className="studio-workflow-tabs" aria-label="Video workflow">
    {[['create','Create Video'],['edit','Edit Video'],['motion','Motion Control']].map(([id,label])=><button key={id} type="button" aria-pressed={active===id} onClick={()=>onChange(id)}>{label}</button>)}
  </nav>;
}
