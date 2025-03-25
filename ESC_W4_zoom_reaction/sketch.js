// 전역 변수 선언
let handpose; // ml5.js의 handpose 모델 객체
let video; // 웹캠 비디오 캡처 객체
let hands = []; // 감지된 손 데이터 저장
let drawings = []; // 사용자가 그린 선의 좌표를 저장
let labelToShow = ""; // 감지된 제스처의 라벨
let emojis = []; // 화면에 표시할 이모티콘의 위치와 텍스트 저장
let lastEmojiTime = 0; // 마지막으로 이모지를 띄운 시간을 저장
let strokeWeightValue = 3; // 선의 기본 굵기

// ✅ 모델 로드 전 필요한 리소스 로드
function preload() {
  handpose = ml5.handPose(); // ml5.js의 handpose 모델 초기화
}

// ✅ 초기 설정
function setup() {
  createCanvas(640, 480); // 캔버스 크기 설정
  video = createCapture(VIDEO, { flipped: true }); // 웹캠 비디오 캡처 (좌우 반전)
  video.size(640, 480); // 비디오 크기 설정
  video.hide(); // 비디오 요소 숨기기
  handpose.detectStart(video, gotHands); // handpose 모델로 비디오에서 손 감지 시작
}

// ✅ 손 데이터 업데이트
function gotHands(results) {
  hands = results; // 감지된 손 데이터를 업데이트
}

// ✅ 매 프레임마다 실행되는 함수
function draw() {
  image(video, 0, 0, width, height); // 비디오를 캔버스에 그리기

  if (hands.length > 0) {
    let leftHand = null;
    let rightHand = null;

    // 두 손이 감지된 경우
    if (hands.length === 2) {
      let rightHand = hands.length > 0 ? hands[0] : null; // 첫 번째 손을 오른손으로 가정
      let leftHand = hands.length > 1 ? hands[1] : null; // 두 번째 손을 왼손으로 가정
      const rightLabel = detectGesture(rightHand); // 오른손의 제스처 감지
      if (rightLabel === "break") {
        // "break" 제스처일 경우
        leftThumb = leftHand.keypoints[4]; // 왼손 엄지 끝 좌표
        leftIndex = leftHand.keypoints[8]; // 왼손 검지 끝 좌표
        if (leftThumb && leftIndex) {
          // 엄지와 검지가 모두 감지된 경우
          // 👉 엄지와 검지의 y좌표 비교로 선 굵기 조절
          if (leftThumb.y < leftIndex.y) {
            strokeWeightValue = constrain(strokeWeightValue + 0.1, 1, 10); // 굵기 증가
          } else if (leftThumb.y > leftIndex.y) {
            strokeWeightValue = constrain(strokeWeightValue - 0.1, 1, 10); // 굵기 감소
          }
        }
      }
    }
    // 한 손만 감지된 경우
    else if (hands.length === 1) {
      rightHand = hands[0]; // 감지된 손을 오른손으로 가정
      const label = detectGesture(rightHand); // 제스처 감지
      console.log("Label:", label); // 감지된 제스처 라벨 출력
      labelToShow = label; // 감지된 제스처 라벨 저장
      const indexTip = rightHand.keypoints[8]; // 검지 끝 좌표
      if (label === "draw") {
        // "draw" 제스처일 경우
        drawings.push({ x: indexTip.x, y: indexTip.y, weight: strokeWeightValue }); // 선 좌표 저장
      } else if (label === "break") {
        // "break" 제스처일 경우
        drawings.push(null); // null을 추가하여 선 끊기
      } else if (label === "clear") {
        // "clear" 제스처일 경우
        drawings = []; // 그린 선 초기화
        emojis = []; // 이모티콘 초기화
        return; // 함수 종료
      } else if (label) {
        // 다른 제스처일 경우
        const now = millis(); // 현재 시간(ms)
        if (now - lastEmojiTime > 1000) {
          // 1초 이상 경과한 경우만 이모티콘 추가
          const thumbTip = rightHand.keypoints[4]; // 엄지 끝 좌표
          if (thumbTip && thumbTip.x !== undefined && thumbTip.y !== undefined) {
            // 👉 timestamp 포함해서 저장
            emojis.push({
              x: thumbTip.x,
              y: thumbTip.y,
              emoji: label,
              timestamp: now,
            });
            lastEmojiTime = now; // 마지막 이모티콘 시간 갱신
          }
        }
      }
    }
  }

  // ✅ 그린 선을 캔버스에 표시
  for (let i = 1; i < drawings.length; i++) {
    const prev = drawings[i - 1]; // 이전 점
    const curr = drawings[i]; // 현재 점
    if (prev === null || curr === null) continue; // 선 끊기
    strokeWeight(curr.weight || 3); // 현재 점의 굵기
    stroke(0); // 검은색 선
    line(width - prev.x, prev.y, width - curr.x, curr.y); // 좌우 반전해서 선 긋기
  }

  // ✅ 이모티콘을 캔버스에 표시하며 시간 경과에 따라 옅어지기
  if (emojis.length > 0) {
    for (let i = emojis.length - 1; i >= 0; i--) {
      const e = emojis[i];
      const age = millis() - e.timestamp; // 이모티콘이 생성된 후 경과 시간 계산
      if (age >= 10000) {
        // 10초 이상 경과한 이모티콘은 제거
        emojis.splice(i, 1);
      } else {
        textSize(32); // 텍스트 크기 설정
        textAlign(CENTER, CENTER); // 텍스트 정렬 설정
        fill(0); // 검은색 텍스트
        text(e.emoji, width - e.x, e.y); // 좌우 반전하여 이모티콘 표시
      }
    }
  }

  // ✅ 디버깅용 정보 출력
  fill(0); // 검은색 텍스트
  noStroke(); // 테두리 없음
  textSize(30); // 텍스트 크기 설정
  text(`Stroke: ${strokeWeightValue.toFixed(1)}`, 100, 40); // 선 굵기 정보 출력
}

// ✅ 손 제스처 감지 함수
function detectGesture(hand) {
  const d = dist; // 두 점 사이의 거리 계산 함수
  const lm = hand.keypoints; // 손의 랜드마크 좌표

  // 주요 랜드마크 좌표
  const thumbTip = lm[4]; // 엄지 끝
  const indexTip = lm[8]; // 검지 끝
  const indexDip = lm[7]; // 검지 관절
  const middleTip = lm[12]; // 중지 끝
  const middleDip = lm[11]; // 중지 관절
  const ringTip = lm[16]; // 약지 끝
  const pinkyTip = lm[20]; // 새끼 끝
  const thumbIp = lm[3]; // 엄지 관절

  // 손가락이 펴져 있는지 확인
  const isThumbExt = isFingerExtended(hand, 4, 3);
  const isIndexExt = isFingerExtended(hand, 8, 6);
  const isMiddleExt = isFingerExtended(hand, 12, 10);
  const isRingExt = isFingerExtended(hand, 16, 14);
  const isPinkyExt = isFingerExtended(hand, 20, 18);

  // 손가락 간 거리 계산
  const dThumbIndex = d(thumbTip.x, thumbTip.y, indexTip.x, indexTip.y);

  // 하트 엄지 관절, 검지 관절 거리 계산 (3,7)
  const dThumbIndexIp = d(thumbIp.x, thumbIp.y, indexDip.x, indexDip.y);

  // 다양한 제스처 감지
  if (isThumbExt && isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt && dThumbIndexIp < 50) {
    return "❤️"; // 하트 제스처
  }

  if (isThumbExt && !isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt && d(thumbIp.x, thumbIp.y, indexDip.x, indexDip.y) > 70) {
    return "👍"; // 좋아요 제스처
  }

  if (!isThumbBent(hand, "right") && isIndexExt && isMiddleExt && isRingExt && isPinkyExt) {
    return "👋"; // 안녕 제스처
  }

  if (dThumbIndex < 30 && isMiddleExt && isRingExt && isPinkyExt) {
    return "👌"; // 오케이 제스처
  }

  if (isThumbBent(hand, "right") && isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt) {
    return "draw"; // 검지 하나만 펴짐: 글씨 쓰기
  }

  if (isThumbBent(hand, "right") && !isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt) {
    return "break"; // 주먹: 선 끊기
  }

  if (isThumbBent(hand, "right") && isIndexExt && isMiddleExt && !isRingExt && !isPinkyExt) {
    return "clear"; // 검지 + 중지: 화면 지우기
  }

  return ""; // 감지된 제스처가 없을 경우 빈 문자열 반환
}

// ✅ 손가락이 펴져 있는지 확인하는 함수
function isFingerExtended(hand, tip, pip) {
  return hand.keypoints[tip].y < hand.keypoints[pip].y - 5; // 손가락 끝이 관절보다 위에 있으면 펴짐
}

// ✅ 엄지가 접혀 있는지 확인하는 함수 (다른 손가락과 구분됨)
function isThumbBent(hand, leftright) {
  if (!hand) return false;
  let thumbTip = hand.keypoints[4]; // 엄지 끝부분
  let thumbBase = hand.keypoints[3]; // 엄지 관절
  if (leftright == "left") {
    return thumbTip.x > thumbBase.x;
  } else if (leftright == "right") {
    return thumbTip.x < thumbBase.x;
  } else {
    return true;
  }
}
