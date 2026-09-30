// GLOBAL STATE 정의했음
let currentList = [];
let visibleCount = 8;
let allLocations = [];

// regionSelect 값이 비었을 때 자동 보정하도록 했음
function ensureRegionSelected() {
  const regionSelect = document.getElementById("regionSelect");
  const si = document.getElementById("siSelect").value;
  const gu = document.getElementById("guSelect").value;
  const dong = document.getElementById("dongSelect").value;

  // 동이 선택된 경우 regionSelect 자동 설정했음
  if (dong) {
    regionSelect.value = dong;
    return;
  }

  // 구가 선택된 경우 해당 구 첫 번째 동을 자동 설정하도록 했음
  if (gu) {
    const dongList = allLocations.filter(
      l => l.name1 === si && l.name2 === gu
    );
    if (dongList.length > 0) {
      regionSelect.value = dongList[0].id;
      return;
    }
  }

  // 시만 선택된 경우 해당 시 첫 지역을 자동 설정했음
  if (si) {
    const first = allLocations.find(l => l.name1 === si);
    if (first) regionSelect.value = first.id;
  }
}

// 지역 목록을 서버에서 불러오도록 했음
async function loadRegions() {
  const res = await fetch(
    "/daangn_locations.json"
  );
  const json = await res.json();

  allLocations =
    json.locations ||
    json.data ||
    (Array.isArray(json) ? json : []);

  loadSi();
}
loadRegions();

// 시 목록을 로드하도록 했음
function loadSi() {
  const siSelect = document.getElementById("siSelect");
  const siList = [...new Set(allLocations.map(l => l.name1))];

  siList.forEach(si => {
    const opt = document.createElement("option");
    opt.value = si;
    opt.textContent = si;
    siSelect.appendChild(opt);
  });
}

// 시 선택 시 구 목록 생성하도록 했음
document.getElementById("siSelect").onchange = function () {
  const si = this.value;
  const guSelect = document.getElementById("guSelect");
  const dongSelect = document.getElementById("dongSelect");

  guSelect.innerHTML = `<option value="">구/군 선택</option>`;
  dongSelect.innerHTML = `<option value="">동 선택</option>`;

  const guList = [...new Set(
    allLocations.filter(l => l.name1 === si).map(l => l.name2)
  )];

  guList.forEach(gu => {
    if (gu) {
      const opt = document.createElement("option");
      opt.value = gu;
      opt.textContent = gu;
      guSelect.appendChild(opt);
    }
  });
};

// 구 선택 시 동 목록 생성하도록 했음
document.getElementById("guSelect").onchange = function () {
  const si = document.getElementById("siSelect").value;
  const gu = this.value;
  const dongSelect = document.getElementById("dongSelect");

  dongSelect.innerHTML = `<option value="">동 선택</option>`;

  const dongList = allLocations.filter(
    l => l.name1 === si && l.name2 === gu
  );

  dongList.forEach(loc => {
    if (loc.name3) {
      const opt = document.createElement("option");
      opt.value = loc.id;
      opt.textContent = loc.name3;
      dongSelect.appendChild(opt);
    }
  });
};

// 동 선택 시 regionSelect 값을 자동 설정하도록 했음
document.getElementById("dongSelect").onchange = function () {
  document.getElementById("regionSelect").value = this.value;
};

// Skeleton UI 표시 기능 정의했음
function showSkeleton() {
  const box = document.getElementById("results");
  box.innerHTML = "";

  for (let i = 0; i < 8; i++) {
    const sk = document.createElement("div");
    sk.className = "skeleton skeleton-card";
    box.appendChild(sk);
  }
}

// 검색 기능의 메인 처리 로직 정의했음
async function loadFromServer() {
  // regionSelect 자동 보정 실행했음
  ensureRegionSelected();

  let region = document.getElementById("regionSelect").value;
  const keyword = document.getElementById("searchInput").value;
  const min = document.getElementById("minPrice").value;
  const max = document.getElementById("maxPrice").value;
  const sort = document.getElementById("sortSelect").value;
  const statusFilter = document.getElementById("statusFilter").value;

  if (!keyword) return alert("검색어를 입력하세요.");

  showSkeleton();

  // region 값이 없을 때 GPS 기반 자동 설정 시도하도록 했음
  if (!region || region.trim() === "") {
    await new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          window._autoLat = pos.coords.latitude;
          window._autoLng = pos.coords.longitude;
          resolve();
        },
        () => resolve()
      );
    });

    if (window._autoLat && window._autoLng) {
      try {
        const geoRes = await fetch(`/api/geolocation?lat=${window._autoLat}&lng=${window._autoLng}`);
        const geoJson = await geoRes.json();

        if (geoJson.locations && geoJson.locations.length > 0) {
          const loc = geoJson.locations[0];
          region = String(loc.id);
          document.getElementById("regionSelect").value = region;
        }
      } catch (err) {
        console.error("GPS 조회 실패함:", err);
      }
    }
  }

  // 지역 값이 없으면 검색 중단하도록 했음
  if (!region || region.trim() === "") {
    alert("지역을 선택하거나 현재 위치를 설정해야 함");
    return;
  }

  // 판매중 검색 시 좌표를 함께 전송하도록 했음
  let lat = null, lng = null;

  if (statusFilter === "Selling") {
    await new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          resolve();
        },
        () => resolve()
      );
    });
  }

  // 서버로 검색 요청 보내도록 했음
  const apiUrl =
    `/api/search?search=${encodeURIComponent(keyword)}&region=${region}` +
    `&min=${min}&max=${max}&sort=${sort}&status=${statusFilter}` +
    (lat && lng ? `&lat=${lat}&lng=${lng}` : "");

  const res = await fetch(apiUrl);
  const data = await res.json();
  const results = document.getElementById("results");

  // 일반 검색 결과를 렌더링하도록 했음
  if (data.list && data.list.length > 0) {
    currentList = data.list;
    visibleCount = 8;
    renderResults(currentList.slice(0, visibleCount));
    document.getElementById("loadMoreBtn").classList.toggle(
      "hidden",
      visibleCount >= currentList.length
    );
    return;
  }

  // 추천 지역이 있을 경우 추천 결과를 표시하도록 했음
  if (data.recommended) {
    const r = data.recommended.region;
    const items = data.recommended.items;

    results.innerHTML = `
       <div>
         검색결과가 없나요?.
         "<span id='autoSearch'
            style="color:#ff7e00; cursor:pointer; font-weight:bold;">
           ${r.name3}
         </span>" 에서 판매글을 찾았습니다.
       </div>
     `;

    document.getElementById("autoSearch").onclick = () => {
      currentList = items;
      visibleCount = 8;
      renderResults(currentList.slice(0, visibleCount));
      document.getElementById("loadMoreBtn").classList.toggle(
        "hidden",
        visibleCount >= currentList.length
      );
    };

    return;
  }

  // 어떤 결과도 없을 경우 메시지 출력했음
  results.innerHTML = `
    <div style="text-align:center; margin-top:20px;">
      검색결과 없음
    </div>
  `;
}

// 검색 결과 렌더링을 수행하도록 했음
function renderResults(list) {
  const box = document.getElementById("results");
  box.innerHTML = "";

  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${item.thumbnail}">
      <div class="card-title">${item.title}</div>
      <div class="card-price">${Number(item.price).toLocaleString()}원</div>
    `;

    card.onclick = () => openDetail(item);
    box.appendChild(card);
  });
}

// 더보기 버튼을 눌렀을 때 추가 결과를 렌더링하도록 했음
document.getElementById("loadMoreBtn").onclick = () => {
  visibleCount += 8;
  renderResults(currentList.slice(0, visibleCount));

  if (visibleCount >= currentList.length) {
    document.getElementById("loadMoreBtn").classList.add("hidden");
  }
};

// 상세보기 모달을 띄우도록 했음
function openDetail(item) {
  document.getElementById("detailImg").src = item.thumbnail;
  document.getElementById("detailTitle").textContent = item.title;
  document.getElementById("detailPrice").textContent =
    Number(item.price).toLocaleString() + "원";
  document.getElementById("detailStatus").textContent =
    item.status === "Ongoing" ? "판매중" : "판매완료";
  document.getElementById("detailCreated").textContent =
    "등록일: " + timeAgo(item.createdAt);
  document.getElementById("detailContent").textContent = item.content;
  document.getElementById("detailLink").href = item.href;

  const modal = document.getElementById("modal");
  modal.style.display = "flex";
  requestAnimationFrame(() => modal.classList.add("show"));
}

// 모달 닫기 버튼 기능 정의했음
document.getElementById("modalClose").onclick = closeModal;

// 모달 배경 클릭 시 닫히도록 했음
document.getElementById("modal").onclick = (e) => {
  if (e.target.id === "modal") closeModal();
};

function closeModal() {
  const modal = document.getElementById("modal");
  modal.classList.remove("show");
  setTimeout(() => modal.style.display = "none", 150);
}

// 검색 버튼과 loadFromServer 연결했음
document.getElementById("searchBtn").onclick = loadFromServer;

// 상대시간 계산하도록 했음
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now - date) / 1000;

  const minutes = diff / 60;
  const hours = minutes / 60;
  const days = hours / 24;
  const months = days / 30;
  const years = days / 365;

  if (diff < 60) return "방금 전";
  if (minutes < 60) return `${Math.floor(minutes)}분 전`;
  if (hours < 24) return `${Math.floor(hours)}시간 전`;
  if (days < 30) return `${Math.floor(days)}일 전`;
  if (months < 12) return `${Math.floor(months)}개월 전`;
  return `${Math.floor(years)}년 전`;
}

// 위치 기반 자동 지역 설정 기능 구현했음
document.getElementById("geoBtn").onclick = () => {
  if (!navigator.geolocation) {
    return alert("이 브라우저는 위치 기능을 지원하지 않음");
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    try {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // 서버에서 가장 가까운 지역 정보를 받아오도록 했음
      const res = await fetch(`/api/geolocation?lat=${lat}&lng=${lng}`);
      const json = await res.json();

      if (!json.locations || json.locations.length === 0) {
        return alert("현재 위치에 맞는 지역을 찾지 못했음");
      }

      const loc = json.locations[0];
      const regionId = String(loc.id);

      // 기존 목록에 지역이 있는지 확인했음
      let exists = allLocations.some(v => String(v.id) === regionId);

      // 없다면 목록에 지역을 추가했음
      if (!exists) {
        allLocations.push({
          id: regionId,
          name1: loc.name1,
          name2: loc.name2,
          name3: loc.name3,
          depth: 3
        });
      }

      // 시 옵션이 없으면 자동 추가했음
      const siSelect = document.getElementById("siSelect");
      if (![...siSelect.options].some(op => op.value === loc.name1)) {
        const o = document.createElement("option");
        o.value = loc.name1;
        o.textContent = loc.name1;
        siSelect.appendChild(o);
      }

      // 시 선택 처리했음
      siSelect.value = loc.name1;
      siSelect.dispatchEvent(new Event("change"));

      // 구 자동 추가 및 선택 처리했음
      setTimeout(() => {
        const guSelect = document.getElementById("guSelect");

        if (![...guSelect.options].some(op => op.value === loc.name2)) {
          const opt = document.createElement("option");
          opt.value = loc.name2;
          opt.textContent = loc.name2;
          guSelect.appendChild(opt);
        }

        guSelect.value = loc.name2;
        guSelect.dispatchEvent(new Event("change"));
      }, 120);

      // 동 자동 추가 및 선택 처리했음
      setTimeout(() => {
        const dongSelect = document.getElementById("dongSelect");

        if (![...dongSelect.options].some(op => op.value === regionId)) {
          const opt = document.createElement("option");
          opt.value = regionId;
          opt.textContent = loc.name3;
          dongSelect.appendChild(opt);
        }

        dongSelect.value = regionId;
        dongSelect.dispatchEvent(new Event("change"));

        document.getElementById("regionSelect").value = regionId;

      }, 250);

      alert(`현재 위치: ${loc.name1} ${loc.name2} ${loc.name3}`);

    } catch (err) {
      console.error(err);
      alert("현재 위치 기반 지역 설정 실패");
    }
  });
};
