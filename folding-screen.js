const panels = [
  { title: '화성향교에 들다', name: '화성성묘전배도', width: 454, height: 1005, motion: 'courtyard' },
  { title: '과거 합격자를 발표하다', name: '낙남헌방방도', width: 444, height: 992, motion: 'courtyard' },
  { title: '혜경궁의 회갑을 축하하다', name: '봉수당진찬도', width: 435, height: 981, motion: 'courtyard' },
  { title: '어르신을 위한 잔치를 열다', name: '낙남헌양로도', width: 428, height: 972, motion: 'courtyard' },
  { title: '성 위에서 군사를 조련하다', name: '서장대성조도', width: 434, height: 960, motion: 'hill' },
  { title: '활을 쏘고 불꽃을 올리다', name: '득중정어사도', width: 424, height: 945, motion: 'courtyard' },
  { title: '행렬이 시흥으로 향하다', name: '환어행렬도', width: 414, height: 935, motion: 'road' },
  { title: '배다리를 건너 한양으로', name: '한강주교환어도', width: 403, height: 924, motion: 'bridge' },
];

const chapterRoot = document.querySelector('#chapters');
const nav = document.querySelector('nav');
const progressBar = document.querySelector('.progress i');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = x => Math.min(1, Math.max(0, x));
const ease = x => x * x * (3 - 2 * x);

function fetchImage(src) {
  const image = new Image();
  image.src = src;
  return image.decode().then(() => image);
}

const scenes = panels.map((panel, index) => {
  const number = index + 1;
  const prefix = 'scenes/screen/' + number;
  const section = document.createElement('section');
  section.className = 'chapter';
  section.id = 'panel-' + number;
  section.setAttribute('aria-labelledby', 'title-' + number);
  section.innerHTML = `
    <div class="scene">
      <div class="caption">
        <div class="sequence">제 ${number}폭 / 8</div>
        <h2 id="title-${number}">${panel.title}</h2>
        <p class="original-name">${panel.name}</p>
        <span class="state">원본 도판</span>
      </div>
      <figure class="art" style="--ratio:${panel.width / panel.height}">
        <img src="${prefix}-original.webp" width="${panel.width}" height="${panel.height}" alt="화성능행도병풍 제 ${number}폭 ${panel.name}">
        <canvas width="${panel.width}" height="${panel.height}" aria-hidden="true"></canvas>
      </figure>
    </div>`;
  chapterRoot.append(section);

  const jump = document.createElement('a');
  jump.href = '#' + section.id;
  jump.textContent = String(number).padStart(2, '0');
  jump.setAttribute('aria-label', '제 ' + number + '폭 ' + panel.name);
  nav.append(jump);

  return {
    panel, prefix, section, jump, art: section.querySelector('.art'),
    state: section.querySelector('.state'),
    ctx: section.querySelector('canvas').getContext('2d'),
    original: section.querySelector('img'), last: -1,
  };
});

function paint(scene, time) {
  if (!scene.layers || reduceMotion.matches || time >= 1) {
    delete scene.art.dataset.animated;
    scene.state.textContent = '원본 도판';
    scene.last = -1;
    return;
  }
  if (time === scene.last) return;
  scene.last = time;
  scene.state.textContent = time < .05 ? '스크롤하여 장면 채우기 ↓' : '인물과 행렬이 자리로 이동 중';
  scene.art.dataset.animated = '';
  const { width, height, motion } = scene.panel;
  const { ctx } = scene;
  const [background, figures] = scene.layers;
  ctx.drawImage(background, 0, 0);

  // Place the painted ranks back in the exact rows they occupy in the source.
  const rows = 18;
  const columns = motion === 'courtyard' ? 4 : 1;
  for (let row = rows - 1; row >= 0; row--) {
    const y = Math.round(row * height / rows);
    const tileHeight = Math.round((row + 1) * height / rows) - y;
    for (let column = 0; column < columns; column++) {
      const x = Math.round(column * width / columns);
      const tileWidth = Math.round((column + 1) * width / columns) - x;
      const delay = (rows - row - 1) / rows * .36 + column * .018;
      const movement = clamp((time - delay) / .45);
      if (!movement) continue;
      const remaining = 1 - ease(movement);
      const entryX = motion === 'bridge' ? -width * .16 : motion === 'road' ? width * .14 : (column < 2 ? -1 : 1) * width * .12;
      const entryY = height * (motion === 'bridge' ? .27 : motion === 'road' ? .19 : .10);
      ctx.globalAlpha = clamp(movement * 4.5);
      ctx.drawImage(figures, x, y, tileWidth, tileHeight,
        x + entryX * remaining, y + entryY * remaining, tileWidth, tileHeight);
    }
  }
  if (scene.original.complete && scene.original.naturalWidth && time > .82) {
    ctx.globalAlpha = ease(clamp((time - .82) / .18));
    ctx.drawImage(scene.original, 0, 0);
  }
  ctx.globalAlpha = 1;
}

function loadScene(scene) {
  if (scene.loading) return;
  scene.loading = Promise.all([
    fetchImage(scene.prefix + '-empty.webp'),
    fetchImage(scene.prefix + '-figures.webp'),
  ]).then(layers => {
    scene.layers = layers;
    schedule();
  }).catch(() => {
    scene.state.textContent = '원본 도판';
  });
}

let frame = 0;
function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(render);
}

function render() {
  frame = 0;
  let active = scenes[0];
  const viewport = document.documentElement.clientHeight;
  for (const scene of scenes) {
    const bounds = scene.section.getBoundingClientRect();
    if (bounds.top < viewport * .55) active = scene;
    if (bounds.top > viewport * 3 || bounds.bottom < -viewport) continue;
    loadScene(scene);
    const time = clamp((-bounds.top) / Math.max(1, bounds.height - viewport) / .91);
    paint(scene, time);
  }
  for (const scene of scenes) {
    scene.jump.setAttribute('aria-current', scene === active ? 'true' : 'false');
  }
  const scrollable = document.documentElement.scrollHeight - viewport;
  progressBar.style.transform = 'scaleX(' + clamp(window.scrollY / Math.max(1, scrollable)) + ')';
}

window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', schedule);
reduceMotion.addEventListener('change', schedule);
document.querySelectorAll('.art img').forEach(image => image.addEventListener('load', schedule));
render();
