// export async function onRequest(context) {
//   try {
//     const url = new URL(context.request.url);

//     const keyword = url.searchParams.get("search") || "";
//     const region = url.searchParams.get("region");
//     const regionId = Number(region); // ← 숫자로 변환 (중요)
//     const min = url.searchParams.get("min") || "";
//     const max = url.searchParams.get("max") || "";
//     const sort = url.searchParams.get("sort") || "latest";
//     const status = url.searchParams.get("status") || "all";

//     if (isNaN(regionId)) {
//       return jsonResponse({ error: "region must be a number" }, 400);
//     }

//     /* -----------------------------------------
//        0) LOCATION JSON LOAD
//     ----------------------------------------- */
//     const locRes = await fetch(
//       "https://raw.githubusercontent.com/KKomaProgrammer/daangn_locations/refs/heads/main/daangn_locations.json",
//       { headers: { "User-Agent": "Mozilla/5.0" } }
//     );

//     const locJson = await locRes.json();
//     const locations = locJson || [];

//     const currentLoc = locations.find(l => l.id === regionId);

//     if (!currentLoc) {
//       return jsonResponse({ error: "invalid region id" }, 400);
//     }

//     /* -----------------------------------------
//        1) 기본 검색
//     ----------------------------------------- */
//     const apiUrl =
//       `https://www.daangn.com/kr/buy-sell/?_data=routes%2fkr.buy-sell._index` +
//       `&in=${regionId}&search=${encodeURIComponent(keyword)}`;

//     const daangnRes = await fetch(apiUrl, {
//       headers: {
//         "User-Agent": "Mozilla/5.0",
//         "Accept": "application/json"
//       }
//     });

//     const baseJson = await daangnRes.json();
//     let list = baseJson.allPage?.fleamarketArticles || [];

//     /* -----------------------------------------
//        2) 상태 필터링
//     ----------------------------------------- */
//     if (status === "Selling") {
//       list = list.filter(item => item.status === "Ongoing");
//     } else if (status === "Closed") {
//       list = list.filter(item => item.status === "Closed");
//     }

//     /* -----------------------------------------
//        3) 현재 지역에 검색 결과 있으면 종료
//     ----------------------------------------- */
//     if (list.length > 0 || status !== "Selling") {
//       return jsonResponse({
//         list,
//         recommended: null
//       });
//     }

//     /* -----------------------------------------
//        4) 판매중 없으면 같은 구(name2) 전체 동에서 검색
//     ----------------------------------------- */
//     const sameGuList = locations.filter(
//       l =>
//         l.name1 === currentLoc.name1 &&
//         l.name2 === currentLoc.name2 &&
//         l.id !== regionId
//     );

//     let recommendedRegion = null;
//     let recommendedItems = [];

//     for (const loc of sameGuList) {
//       const testURL =
//         `https://www.daangn.com/kr/buy-sell/?_data=routes%2fkr.buy-sell._index` +
//         `&search=${encodeURIComponent(keyword)}&in=${loc.id}`;

//       const testRes = await fetch(testURL, {
//         headers: { "User-Agent": "Mozilla/5.0" }
//       });

//       const testJson = await testRes.json();
//       const tempList = testJson.allPage?.fleamarketArticles || [];

//       const sellingItems = tempList.filter(i => i.status === "Ongoing");

//       if (sellingItems.length > 0) {
//         recommendedRegion = loc;
//         recommendedItems = sellingItems;
//         break;
//       }
//     }

//     /* -----------------------------------------
//        5) 같은 구 안에서도 없으면 추천 없음
//     ----------------------------------------- */
//     if (!recommendedRegion) {
//       return jsonResponse({
//         list: [],
//         recommended: null,
//         info: "현재 지역 및 같은 구/군 안에서도 판매중 항목 없음"
//       });
//     }

//     /* -----------------------------------------
//        6) 추천 지역 반환
//     ----------------------------------------- */
//     return jsonResponse({
//       list: [],
//       recommended: {
//         region: recommendedRegion,
//         items: recommendedItems
//       }
//     });

//   } catch (err) {
//     return jsonResponse({ error: err.message }, 500);
//   }
// }

// /* JSON 응답 */
// function jsonResponse(obj, status = 200) {
//   return new Response(JSON.stringify(obj), {
//     status,
//     headers: {
//       "Content-Type": "application/json",
//       "Access-Control-Allow-Origin": "*"
//     }
//   });
// }
export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);

    const keyword = url.searchParams.get("search") || "";
    const region = url.searchParams.get("region");
    const regionId = Number(region);
    const min = url.searchParams.get("min") || "";
    const max = url.searchParams.get("max") || "";
    const sort = url.searchParams.get("sort") || "latest";
    const status = url.searchParams.get("status") || "all";

    if (isNaN(regionId)) {
      return jsonResponse({ error: "region must be a number" }, 400);
    }

    // 가격 안전 변환 함수
    function toPrice(value) {
      const n = Number(value);
      return isNaN(n) ? null : n;
    }

    /* 0) 위치 JSON */
    const locRes = await fetch(
      "https://raw.githubusercontent.com/KKomaProgrammer/daangn_locations/refs/heads/main/daangn_locations.json",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );

    const locations = await locRes.json();
    const currentLoc = locations.find(l => l.id === regionId);

    if (!currentLoc) return jsonResponse({ error: "invalid region id" }, 400);

    /* 1) 기본 검색 */
    const apiUrl =
      `https://www.daangn.com/kr/buy-sell/?_data=routes%2fkr.buy-sell._index` +
      `&in=${regionId}&search=${encodeURIComponent(keyword)}`;

    const daangnRes = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    const baseJson = await daangnRes.json();
    let list = baseJson.allPage?.fleamarketArticles || [];

    /* 2) 상태 필터 */
    if (status === "Selling") list = list.filter(i => i.status === "Ongoing");
    else if (status === "Closed") list = list.filter(i => i.status === "Closed");

    /* 3) 가격 필터 */
    const minNum = min ? Number(min) : null;
    const maxNum = max ? Number(max) : null;

    if (minNum !== null || maxNum !== null) {
      list = list.filter(item => {
        const price = toPrice(item.price);

        if (price === null) return true; // 가격이 없으면 제거하지 않음

        if (minNum !== null && price < minNum) return false;
        if (maxNum !== null && price > maxNum) return false;

        return true;
      });
    }

    /* 4) 최신순 정렬 */
    if (sort === "latest") {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /* 5) 현재 지역 결과 있으면 반환 */
    if (list.length > 0 || status !== "Selling") {
      return jsonResponse({ list, recommended: null });
    }

    /* 6) 동일 구(name2)에서 탐색 */
    const sameGuList = locations.filter(
      l => l.name1 === currentLoc.name1 && l.name2 === currentLoc.name2 && l.id !== regionId
    );

    let recommendedRegion = null;
    let recommendedItems = [];

    for (const loc of sameGuList) {
      const testURL =
        `https://www.daangn.com/kr/buy-sell/?_data=routes%2fkr.buy-sell._index` +
        `&search=${encodeURIComponent(keyword)}&in=${loc.id}`;

      const testRes = await fetch(testURL, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const testJson = await testRes.json();
      let tempList = testJson.allPage?.fleamarketArticles || [];

      tempList = tempList.filter(i => i.status === "Ongoing");

      // 동일 가격 필터 적용
      if (minNum !== null || maxNum !== null) {
        tempList = tempList.filter(item => {
          const price = toPrice(item.price);
          if (price === null) return true;
          if (minNum !== null && price < minNum) return false;
          if (maxNum !== null && price > maxNum) return false;
          return true;
        });
      }

      if (sort === "latest") {
        tempList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      if (tempList.length > 0) {
        recommendedRegion = loc;
        recommendedItems = tempList;
        break;
      }
    }

    if (!recommendedRegion) {
      return jsonResponse({
        list: [],
        recommended: null,
        info: "현재 지역 및 동일 구 내에서도 판매중 항목 없음"
      });
    }

    return jsonResponse({
      list: [],
      recommended: {
        region: recommendedRegion,
        items: recommendedItems
      }
    });

  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

/* JSON Response */
function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

