import re, json, os
ROOT=os.path.dirname(os.path.abspath(__file__))
icons_dir=os.path.join(ROOT,'vendor/node_modules/lucide-static/icons/')
def ic(name):
    svg=open(icons_dir+name+'.svg',encoding='utf-8').read()
    svg=re.sub(r'<!--.*?-->','',svg,flags=re.S).strip()
    m=re.match(r'<svg([^>]*)>',svg); attrs=m.group(1)
    attrs=re.sub(r'\s(width|height|class|xmlns)="[^"]*"','',attrs)
    svg='<svg'+attrs+'>'+svg[m.end():]
    return re.sub(r'\s+',' ',svg)
MAP={'detach':'unlink','ellipsis':'ellipsis','sliders':'sliders-horizontal','quicknotes':'notebook-pen','sticky':'sticky-note','heading':'heading-1','link':'link','tasks':'list-todo','column':'rectangle-vertical','board':'layout-grid','image':'image','line':'spline','swatch':'palette','upload':'upload','trash':'trash-2','open':'external-link','dup':'copy','up':'arrow-up','down':'arrow-down','inbox':'inbox','check':'check','undo':'undo-2','redo':'redo-2','fit':'maximize','moon':'moon','sun':'sun','download':'download','help':'circle-help','panel':'panel-right','imageplus':'image-plus','x':'x','lock':'lock','unlock':'lock-open','alLeft':'align-start-vertical','alHC':'align-center-vertical','alRight':'align-end-vertical','alTop':'align-start-horizontal','alVC':'align-center-horizontal','alBottom':'align-end-horizontal','alHS':'align-horizontal-space-between','alVS':'align-vertical-space-between','align':'layout-grid','bold':'bold','italic':'italic','underline':'underline','strike':'strikethrough','list':'list','listo':'list-ordered','aligncenter':'align-center','type':'type','highlighter':'highlighter','h1':'heading-1','h2':'heading-2','pilcrow':'pilcrow','small':'a-large-small','callout':'message-square','quote':'quote','code':'code','minus':'minus','move':'move-horizontal','chevdown':'chevron-down','chevup':'chevron-up','smile':'smile','paint':'paint-bucket','eye':'eye','search':'search','present':'presentation','file':'file','faudio':'file-audio','fvideo':'file-video','ftext':'file-text','refresh':'refresh-cw','template':'layout-template','grip':'grip-vertical','text':'text','arrowr':'arrow-right','weight':'move-diagonal','comment':'message-square-text','table':'table','sketch':'pen-line','doc':'file-text','audio':'music','map':'map-pin','video':'video','draw':'pencil','eraser':'eraser','play':'play','more':'ellipsis','caption':'captions','transparent':'square-dashed','info':'info','display':'layout-panel-top','loop':'repeat','autoplay':'circle-play','connect':'waypoints','rename':'text-cursor-input','collapse':'chevrons-down-up','drawon':'pen-tool','arrowl':'arrow-left','cut':'scissors','indent':'indent-increase','outdent':'indent-decrease','insert':'square-plus','pipette':'pipette','dot':'circle','plus':'plus','pause':'pause','vol':'volume-2','volx':'volume-x'}
BOARD_ICONS=['hand', 'clapperboard', 'palette', 'clipboard-list', 'lightbulb', 'file-pen-line', 'image', 'film', 'music', 'folder', 'book-open', 'briefcase', 'camera', 'house', 'building-2', 'trees', 'plane', 'star', 'heart', 'flame', 'rocket', 'target', 'pin', 'calendar', 'box', 'layers', 'pen-tool', 'sparkles', 'compass', 'flag', 'coffee', 'shopping-bag', 'users', 'user', 'globe', 'mic', 'video', 'monitor', 'smartphone', 'gamepad-2', 'graduation-cap', 'flask-conical', 'leaf', 'sun', 'moon', 'cloud', 'mountain', 'map', 'gift', 'trophy', 'bookmark', 'archive', 'package', 'scissors', 'brush', 'shapes', 'award']
for n in BOARD_ICONS: MAP['bi_'+n]=n
for n in ['youtube','instagram','twitter','facebook']: MAP['br_'+n]=n
for k,v in MAP.items():
    if not os.path.exists(icons_dir+v+'.svg'): raise SystemExit('missing icon '+v)
# Conjunto de ícones: Phosphor Regular (MIT, traço parecido com SF Symbols). Lucide fica como reserva.
ICON_SET=os.environ.get('SPACE_ICONS','phosphor')
ph_dir=os.path.join(ROOT,'vendor/node_modules/@phosphor-icons/core/assets/regular/')
PHM={}
exec(open(os.path.join(ROOT,'src/icons_phosphor.py'),encoding='utf-8').read(),PHM)
def ph_name(k):
    if k.startswith('bi_'): return PHM['BI'].get(k[3:])
    if k.startswith('br_'): return PHM['BR'].get(k[3:])
    return PHM['PH'].get(k)
def icon_svg(k,v):
    if ICON_SET=='phosphor':
        n=ph_name(k)
        if n and os.path.exists(ph_dir+n+'.svg'):
            svg=open(ph_dir+n+'.svg',encoding='utf-8').read()
            m=re.match(r'<svg([^>]*)>',svg.strip()); attrs=re.sub(r'\s(width|height|class|xmlns)="[^"]*"','',m.group(1))
            return re.sub(r'\s+',' ','<svg'+attrs+' class="ph">'+svg.strip()[m.end():])
    return ic(v)
icons={k:icon_svg(k,v) for k,v in MAP.items()}
css=open(os.path.join(ROOT,'src/style.css'),encoding='utf-8').read()
markup=open(os.path.join(ROOT,'src/markup.html'),encoding='utf-8').read()
js=open(os.path.join(ROOT,'src/app.js'),encoding='utf-8').read().replace('/*@@PARITY@@*/', open(os.path.join(ROOT,'src/parity.js'),encoding='utf-8').read()+'\n'+open(os.path.join(ROOT,'src/parity2.js'),encoding='utf-8').read()+'\n'+open(os.path.join(ROOT,'src/desktop.js'),encoding='utf-8').read())
out='<title>Space</title>\n<style>\n'+css+'\n</style>\n'+markup+'\n<script>window.__ICONS='+json.dumps(icons,ensure_ascii=False)+';window.__BOARD_ICONS='+json.dumps(BOARD_ICONS)+';</script>\n<script>\n'+js+'\n</script>\n'
open(os.path.join(ROOT,'space.html'),'w',encoding='utf-8').write(out)
open(os.path.join(ROOT,'test/index.html'),'w',encoding='utf-8').write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">'+out+'</body></html>')
open(os.path.join(ROOT,'test/check.js'),'w',encoding='utf-8').write(js)
print('built', len(out))

# ---- app de desktop (Tauri): app/index.html + libs locais (export funciona offline)
import shutil
app_dir=os.path.join(ROOT,'app'); os.makedirs(os.path.join(app_dir,'libs'),exist_ok=True)
open(os.path.join(app_dir,'index.html'),'w',encoding='utf-8').write('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script>window.__SPACE_APP=true</script></head><body style="margin:0">'+out+'</body></html>')
for f in os.listdir(os.path.join(ROOT,'vendor/libs')): shutil.copy(os.path.join(ROOT,'vendor/libs',f), os.path.join(app_dir,'libs',f))
print('app built', os.path.join(app_dir,'index.html'))
