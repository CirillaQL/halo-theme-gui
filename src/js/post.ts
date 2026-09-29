const content = document.querySelector<HTMLElement>(".article-content");

const DESKTOP_TOC_QUERY = "(min-width: 1280px)";
const HEADER_OFFSET = 96;

function slugify(text: string, used: Set<string>) {
  const base =
    text
      .trim()
      .toLowerCase()
      .replace(/[\s　]+/g, "-")
      .replace(/[^\p{L}\p{N}_-]/gu, "") || "section";
  let slug = base;
  let i = 1;
  while (used.has(slug) || document.getElementById(slug)) {
    slug = `${base}-${i++}`;
  }
  used.add(slug);
  return slug;
}

function setupReadingStats(root: HTMLElement) {
  const target = document.querySelector<HTMLElement>("[data-reading-stats]");
  if (!target) return;

  const text = root.textContent ?? "";
  const cjk = text.match(/[㐀-鿿豈-﫿]/g)?.length ?? 0;
  const words = text.replace(/[㐀-鿿豈-﫿]/g, " ").match(/[A-Za-z0-9]+/g)?.length ?? 0;
  const total = cjk + words;
  if (total === 0) return;

  const minutes = Math.max(1, Math.round(cjk / 400 + words / 200));
  const count = total >= 10000 ? `${(total / 10000).toFixed(1)} 万字` : `${total} 字`;
  target.textContent = `${count} · 约 ${minutes} 分钟`;
  target.hidden = false;
}

function setupToc(root: HTMLElement) {
  const toc = document.querySelector<HTMLElement>("[data-toc]");
  const details = toc?.querySelector("details");
  const list = toc?.querySelector<HTMLOListElement>("[data-toc-list]");
  if (!toc || !details || !list) return;

  const headings = Array.from(root.querySelectorAll<HTMLHeadingElement>("h2, h3"));
  if (headings.length < 2) return;

  const used = new Set<string>();
  const links = new Map<HTMLHeadingElement, HTMLAnchorElement>();

  for (const heading of headings) {
    if (!heading.id) heading.id = slugify(heading.textContent ?? "", used);

    const item = document.createElement("li");
    item.className = `toc-level-${heading.tagName.toLowerCase()}`;
    const link = document.createElement("a");
    link.href = `#${encodeURIComponent(heading.id)}`;
    link.textContent = heading.textContent?.trim() ?? "";
    link.addEventListener("click", (event) => {
      event.preventDefault();
      heading.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${encodeURIComponent(heading.id)}`);
      if (!window.matchMedia(DESKTOP_TOC_QUERY).matches) details.open = false;
    });
    item.append(link);
    list.append(item);
    links.set(heading, link);
  }

  toc.hidden = false;

  const media = window.matchMedia(DESKTOP_TOC_QUERY);
  const syncOpen = () => {
    details.open = media.matches;
  };
  syncOpen();
  media.addEventListener("change", syncOpen);

  let active: HTMLAnchorElement | undefined;
  const updateActive = () => {
    let current = headings[0];
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top - HEADER_OFFSET - 8 <= 0) current = heading;
      else break;
    }
    const link = links.get(current);
    if (link === active) return;
    active?.classList.remove("is-active");
    link?.classList.add("is-active");
    active = link;
  };

  return updateActive;
}

function setupCodeCopy(root: HTMLElement) {
  if (!navigator.clipboard) return;

  for (const pre of Array.from(root.querySelectorAll<HTMLPreElement>("pre"))) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy";
    button.textContent = "复制";
    button.addEventListener("click", async () => {
      const code = pre.querySelector("code") ?? pre;
      try {
        await navigator.clipboard.writeText(code.textContent ?? "");
        button.textContent = "已复制";
      } catch {
        button.textContent = "失败";
      }
      window.setTimeout(() => {
        button.textContent = "复制";
      }, 1600);
    });

    const wrapper = document.createElement("div");
    wrapper.className = "code-block";
    pre.replaceWith(wrapper);
    wrapper.append(pre, button);
  }
}

function setupImages(root: HTMLElement) {
  for (const img of Array.from(root.querySelectorAll("img"))) {
    if (!img.hasAttribute("loading")) img.loading = "lazy";
    img.decoding = "async";
  }
}

function setupScrollEffects(onScroll?: () => void) {
  const progress = document.querySelector<HTMLElement>(".reading-progress span");
  const backToTop = document.querySelector<HTMLButtonElement>("[data-back-to-top]");
  const article = document.querySelector<HTMLElement>(".article-detail");

  backToTop?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  let ticking = false;
  const update = () => {
    ticking = false;

    if (progress && article) {
      const rect = article.getBoundingClientRect();
      const distance = rect.height - window.innerHeight;
      const ratio = distance > 0 ? Math.min(1, Math.max(0, -rect.top / distance)) : 1;
      progress.style.transform = `scaleX(${ratio})`;
    }

    if (backToTop) backToTop.hidden = window.scrollY < window.innerHeight * 0.8;

    onScroll?.();
  };

  const request = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  update();
}

if (content) {
  setupReadingStats(content);
  setupImages(content);
  setupCodeCopy(content);
  setupScrollEffects(setupToc(content));
}
