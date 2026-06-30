import os, re

base = '/var/mobile/Library/Mobile Documents/iCloud~com~thomfang~Scripting/Documents/scripts/多功能宝箱'

files = []
for root, dirs, fnames in os.walk(base):
    for fn in fnames:
        if fn.endswith('.tsx') and not fn.startswith('_'):
            files.append(os.path.join(root, fn))

total = 0
for path in sorted(files):
    with open(path, 'r') as f:
        content = f.read()
    
    lines = content.split('\n')
    new_lines = []
    added = 0
    
    for i, line in enumerate(lines):
        new_lines.append(line)
        
        if 'material=' not in line:
            continue
        
        # Find the cornerRadius in the next 10 lines
        radius_val = None
        corner_line = -1
        closing_gt = -1
        for j in range(i+1, min(i+12, len(lines))):
            stripped = lines[j].strip()
            if 'cornerRadius=' in lines[j]:
                m = re.search(r'cornerRadius=\{?(\d+)', lines[j])
                if m:
                    radius_val = int(m.group(1))
                corner_line = j
            if stripped == '>' or stripped == '/>':
                closing_gt = j
                break
        
        if radius_val is None or closing_gt < 0:
            continue
        
        # Check if clipShape already exists between material and closing >
        has_clip = False
        for j in range(i, closing_gt + 1):
            if 'clipShape' in lines[j]:
                has_clip = True
                break
        
        if has_clip:
            continue
        
        # Get indent from cornerRadius line (or material line)
        ref_line = lines[corner_line] if corner_line > 0 else line
        indent = len(ref_line) - len(ref_line.lstrip())
        ind = ' ' * indent
        
        # Determine clipShape value
        if radius_val >= 20:
            clip_line_1 = f'{ind}// @ts-ignore'
            clip_line_2 = f'{ind}clipShape="capsule"'
        else:
            clip_line_1 = f'{ind}// @ts-ignore'
            clip_line_2 = f'{ind}clipShape={{ type: "rect", cornerRadius: {radius_val} }}'
        
        # Insert clipShape right before the closing > line
        # We need to insert into new_lines at the position corresponding to closing_gt
        # But new_lines might have shifted. Find the right position.
        # Simple: insert after the cornerRadius line
        insert_pos = len(new_lines)  # default: end
        # Find the position of closing_gt in new_lines (accounting for insertions)
        # Since we process sequentially, the closing > hasn't been added yet
        # So we'll insert right now (after cornerRadius was added)
        new_lines.append(clip_line_1)
        new_lines.append(clip_line_2)
        added += 1
        total += 1
    
    if added > 0:
        with open(path, 'w') as f:
            f.write('\n'.join(new_lines))
        fn = os.path.basename(path)
        print(f'{fn}: +{added} clipShape props')

print(f'\nTotal: {total} clipShape additions')
