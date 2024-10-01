// API 객체
class APIHandler {
  constructor() {
    this.API_URL =
      "https://5tl9sd8f4e.execute-api.ap-northeast-2.amazonaws.com/cards"; // 실제 API Gateway 엔드포인트
  }

  // GET 카드 목록 가져오기
  async getCards() {
    const response = await fetch(this.API_URL);
    const data = await response.json();
    return data;
  }

  // POST 카드 생성
  async postCard(cardObj) {
    const response = await fetch(this.API_URL, {
      method: "POST",
      body: JSON.stringify(cardObj),
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    return data.id;
  }

  // PUT 카드 업데이트
  async putCard(cardObj) {
    const response = await fetch(`${this.API_URL}/${cardObj.id}`, {
      method: "PUT",
      body: JSON.stringify(cardObj),
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    return data;
  }

  // DELETE 카드 삭제
  async deleteCard(id) {
    await fetch(`${this.API_URL}/${id}`, {
      method: "DELETE",
    });
  }
}

// API 객체 생성
const API = new APIHandler();

// 카드 클래스
class Card {
  constructor(cardElement, title, id, category) {
    this.cardElement = cardElement;
    this.title = title;
    this.id = id;
    this.category = category;
  }
}

// 전체 카드 카테고리 요소 반환
const getCardContainers = () => {
  return document.querySelectorAll(".card-container");
};

// 카드 요소에서 카드 객체 반환
const getCardInfo = (cardElement) =>
  new Card(
    cardElement,
    cardElement.children[1].value,
    cardElement.id.replace("card-id-", ""),
    cardElement.parentNode.parentNode.getAttribute("data-card-category")
  );

// 카드 드래그 앤 드랍 시작 이벤트
const ondragstart = (event) => {
  let cardId = event.target.id;
  if (!cardId) {
    console.error("카드 ID가 유효하지 않습니다.");
    return;
  }

  let currentColumnType =
    event.target.parentNode.parentNode.getAttribute("data-card-category");
  getCardContainers().forEach((element) => {
    if (
      element.parentNode.getAttribute("data-card-category") !==
      currentColumnType
    ) {
      element.classList.add("hoverable");
    }
  });
  event.dataTransfer.setData("cardID", cardId);
  event.dataTransfer.setData("columnType", currentColumnType);
};

// 카드 온드랍 이벤트
const cardOnDrop = async (event) => {
  event.target.classList.remove("hover");
  let from = event.dataTransfer.getData("columnType");
  let to = event.target.parentNode.getAttribute("data-card-category");
  let id = event.dataTransfer.getData("cardID"); // 카드 id 가져오기
  let card = document.getElementById(id); // 기존 카드 요소 찾기

  if (from && to && card && from !== to) {
    // 카드를 새로운 카테고리로 이동
    event.target.appendChild(card);

    // 서버로 카테고리 업데이트 요청
    let cardObj = getCardInfo(card);
    cardObj.category = to; // 카테고리만 업데이트
    try {
      await updateCard(cardObj); // 서버에 업데이트 요청
    } catch (error) {
      console.error("카드 업데이트 실패:", error);
    }
  }
};

// 카드 드래그 앤 드랍 종료 이벤트
const ondragend = (event) => {
  getCardContainers().forEach((element) => {
    element.classList.remove("hoverable");
  });
};

// 새로운 카드 생성 이벤트
const createCard = async (event) => {
  let category = event.target.parentNode.getAttribute("data-card-category");

  // 카드 제목 입력받기
  let title = "";

  // 카드 생성 시 ID를 할당 (예: Date.now())
  let cardObj = new Card(null, title, Date.now().toString(), category);

  // UI에 바로 카드 추가
  cardFactory(cardObj);

  // 서버에 카드 등록
  await registerCard(cardObj);
};

// 기존/신규 카드 요소 생성. 이후 onChangeCard() 트리거
const cardFactory = (cardObj) => {
  let cardElement = document.createElement("div");
  cardElement.className = "card";
  cardElement.ondragstart = ondragstart;
  cardElement.ondragend = ondragend;
  cardElement.setAttribute("draggable", true);
  if (cardObj.id) cardElement.id = "card-id-" + cardObj.id;

  let title = document.createElement("textarea");
  title.setAttribute("rows", 3);
  title.setAttribute("cols", 1);
  title.setAttribute("name", "title");
  title.className = "card-title";
  title.onchange = onChangeCard;
  if (cardObj.title) title.value = cardObj.title;

  let del = document.createElement("div");
  del.innerHTML = "x";
  del.className = "card-delete";
  del.onclick = deleteCard;

  cardElement.appendChild(del);
  cardElement.appendChild(title);

  // 카테고리가 존재하는지 확인
  let cardContainer = document.querySelectorAll(
    `[data-card-category='${cardObj.category}']`
  )[0];
  if (!cardContainer) {
    console.error(`카테고리 '${cardObj.category}'가 존재하지 않습니다.`);
    return;
  }

  let container = cardContainer.querySelector(".card-container");
  if (!container) {
    console.error(`'${cardObj.category}'에 대한 card-container가 없습니다.`);
    return;
  }

  container.appendChild(cardElement);
  title.focus();
};

// 카드 생성/업데이트 컨트롤러
const onChangeCard = (event) => {
  let title = event.target.value.trim();
  let cardElement = event.target.parentNode;
  let cardObj = getCardInfo(cardElement);
  if (title.length > 0 && cardElement.id === "") {
    registerCard(cardObj);
  } else if (title.length > 0 && cardElement.id !== "") {
    updateCard(cardObj);
  } else {
    card.remove(); // 입력된 내용이 없으면 카드 생성 취소
  }
};

// 기존 카드들 불러오기
const getCards = async () => {
  var cards = await API.getCards();
  if (cards && cards.length > 0) {
    cards.forEach((card) => {
      let cardObj = new Card(null, card.title, card.id, card.category);
      cardFactory(cardObj);
    });
  }
};

// 카드 업데이트
const registerCard = async (cardObj) => {
  let cardId = await API.postCard(cardObj);
  cardObj.cardElement.id = "card-id-" + cardId; // ID를 카드 요소에 설정
};

const updateCard = async (cardObj) => {
  await API.putCard(cardObj);
};

// 카드 삭제
const deleteCard = (event) => {
  let cardElement = event.target.parentNode;
  let id = cardElement.id.replace("card-id-", "");

  // ID가 유효하지 않을 경우 실행 중단
  if (!id) {
    console.error("카드 ID가 유효하지 않습니다.");
    return;
  }

  // ID가 유효한 경우 API 호출
  API.deleteCard(id);
  cardElement.remove();
};

// 드래그 앤 드랍 이벤트 등록
(() => {
  window.createCard = createCard;
  getCardContainers().forEach((element) => {
    element.ondragenter = (event) => event.target.classList.add("hover");
    element.ondragleave = (event) => event.target.classList.remove("hover");
    element.ondragover = (event) => event.preventDefault();
    element.ondrop = cardOnDrop;
  });
  getCards();
})();
