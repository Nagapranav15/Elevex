import re

index_file = '/Users/nagapranav/Documents/Projects/Elevex/index-new.html'

with open(index_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Replacement mapping from body.html
replacements = {
    # 1. Logo
    'https://elevex.co.in/wp-content/uploads/2026/08/logo-elevex-white.png': 'https://elevex.co.in/wp-content/uploads/2026/08/logo-elevex-white-1.png',
    
    # 2. Scissor lift main image -> scissor-lift-main-1.png
    'https://elevex.co.in/wp-content/uploads/2026/08/scissor-lift-main.png': 'https://elevex.co.in/wp-content/uploads/2026/08/scissor-lift-main-1.png',
    'https://elevex.co.in/wp-content/uploads/2026/08/scissor-lift-main.jpg': 'https://elevex.co.in/wp-content/uploads/2026/08/scissor-lift-main-1.png',
    'UP + \'scissor-lift-main.jpg\'': 'UP + \'scissor-lift-main-1.png\'',
    'UP + \'scissor-lift-main.png\'': 'UP + \'scissor-lift-main-1.png\'',
    
    # 3. Hero background image -> scissor-lift-hero-1.jpg
    'https://elevex.co.in/wp-content/uploads/2026/08/scissor-lift-hero.jpg': 'https://elevex.co.in/wp-content/uploads/2026/08/scissor-lift-hero-1.jpg',
    
    # 4. Boom lift main -> boom-lift-main.png
    'https://elevex.co.in/wp-content/uploads/2026/08/boom-lift-main.jpg': 'https://elevex.co.in/wp-content/uploads/2026/08/boom-lift-main.png',
    'UP + \'boom-lift-main.jpg\'': 'UP + \'boom-lift-main.png\'',
    
    # 5. Terrain lift main -> terrain-lift-main.png
    'https://elevex.co.in/wp-content/uploads/2026/08/terrain-lift-main.jpg': 'https://elevex.co.in/wp-content/uploads/2026/08/terrain-lift-main.png',
    'UP + \'terrain-lift-main.jpg\'': 'UP + \'terrain-lift-main.png\'',
}

for old_url, new_url in replacements.items():
    count = content.count(old_url)
    content = content.replace(old_url, new_url)
    print(f"Replaced in index-new.html: '{old_url}' -> '{new_url}' ({count} occurrences)")

# Sync hero category tabs flex-wrap: nowrap in index-new.html
old_tabs_css = """    .ex-hero__tabs {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px;
      border-radius: 999px;
      background: rgba(255, 255, 255, .05);
      border: 1px solid rgba(255, 255, 255, .12);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      margin-bottom: 20px;
      flex-wrap: wrap
    }"""

new_tabs_css = """    .ex-hero__tabs {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px;
      border-radius: 999px;
      background: rgba(255, 255, 255, .05);
      border: 1px solid rgba(255, 255, 255, .12);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      margin-bottom: 20px;
      flex-wrap: nowrap;
      max-width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }"""

if old_tabs_css in content:
    content = content.replace(old_tabs_css, new_tabs_css)

with open(index_file, 'w', encoding='utf-8') as f:
    f.write(content)

# Update index.html to be identical copy of updated index-new.html
with open('/Users/nagapranav/Documents/Projects/Elevex/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated index-new.html and synced to index.html successfully.")
