
export async function fetchCsv(url: string){
  const res = await fetch(url, { cache: 'no-store' })
  const text = await res.text()
  const lines = text.trim().split(/\r?\n/)
  const header = lines[0].split(',').map(s=>s.trim())
  const rows = lines.slice(1).map(l=>{
    const cols = l.split(',')
    const obj:any = {}
    header.forEach((h,i)=> obj[h] = (cols[i]??'').trim())
    return obj
  })
  return rows
}
