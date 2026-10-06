"""Download the public Riot Data Dragon artwork used by the local game."""
import concurrent.futures, json, pathlib, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets'
VERSION = json.load(urllib.request.urlopen('https://ddragon.leagueoflegends.com/api/versions.json'))[0]
CHAMPIONS = {'annie':'Annie','brand':'Brand','morgana':'Morgana','veigar':'Veigar','ziggs':'Ziggs','fizz':'Fizz','masteryi':'MasterYi','leesin':'LeeSin','darius':'Darius','malphite':'Malphite','blitzcrank':'Blitzcrank','leona':'Leona','vayne':'Vayne','caitlyn':'Caitlyn','missfortune':'MissFortune','sona':'Sona'}

def fetch(pair):
    url, filename = pair
    path = OUT / filename
    if path.exists(): return filename
    with urllib.request.urlopen(url, timeout=30) as response:
        data = response.read()
    if len(data) < 100: raise ValueError(f'Empty artwork: {filename}')
    path.write_bytes(data)
    return filename

def hero_art(pair):
    key, riot = pair
    url = f'https://ddragon.leagueoflegends.com/cdn/{VERSION}/data/en_US/champion/{riot}.json'
    data = json.load(urllib.request.urlopen(url, timeout=30))['data'][riot]
    images = [(f'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{riot}_0.jpg',f'{key}-splash.jpg'),(f'https://ddragon.leagueoflegends.com/cdn/{VERSION}/img/champion/{riot}.png',f'{key}-portrait.png')]
    images += [(f'https://ddragon.leagueoflegends.com/cdn/{VERSION}/img/spell/{spell["image"]["full"]}',f'{key}-{button}.png') for button,spell in zip('QWER',data['spells'])]
    return images

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        jobs = [image for group in pool.map(hero_art, CHAMPIONS.items()) for image in group]
        # item-data remains the authoritative game catalog; Node only exports its JSON.
        import subprocess
        catalog = json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {ITEMS} from './src/item-data.js'; console.log(JSON.stringify(ITEMS))"],cwd=ROOT))
        jobs += [(f'https://ddragon.leagueoflegends.com/cdn/{VERSION}/img/item/{item["riotId"]}.png',f'item-{item["id"]}.png') for item in catalog if item.get('riotId')]
        fetched = list(pool.map(fetch, jobs))
    print(f'Artwork ready: {len(fetched)} files, Data Dragon {VERSION}')
