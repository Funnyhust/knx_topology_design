"""Refresh MD5 revisions in the existing draw.io precache manifest."""
import hashlib
import re
from pathlib import Path

web = Path(__file__).resolve().parent.parent / 'src/main/webapp'
version = (web.parents[2] / 'VERSION').read_text().strip()
worker = web / 'service-worker.js'
source = worker.read_text(encoding='utf-8')


def revision(match):
    path = web / match.group(1)
    if not path.is_file():
        # Optional upstream integrations are absent in the KNX checkout.
        return match.group(0)
    digest = hashlib.md5(path.read_bytes()).hexdigest()
    if path.suffix == '.html':
        digest += '-' + version
    return '{"url":"' + match.group(1) + '","revision":"' + digest + '"}'


source, count = re.subn(r'\{"url":"([^"]+)","revision":"[^"]+"\}', revision, source)
if not count:
    raise RuntimeError('Precache manifest was not found')
worker.write_text(source, encoding='utf-8', newline='\n')
print('Updated', count, 'precache revisions')
