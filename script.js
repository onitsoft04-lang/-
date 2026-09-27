// ==========================================
// 지뢰 찾기 게임 로직 스크립트
// 초보자를 위해 각 기능이 어떤 역할을 하는지 상세히 주석으로 설명했습니다!
// ==========================================

// 게임에 필요한 HTML 요소들을 가져옵니다.
const boardElement = document.getElementById('game-board'); // 게임 보드(그리드) 영역
const mineCountElement = document.getElementById('mine-count'); // 남은 지뢰 표시 영역
const statusMessage = document.getElementById('status-message'); // 상태 메시지 표시 영역
const levelButtons = document.querySelectorAll('.level-btn'); // 레벨 선택 버튼들
const restartBtn = document.getElementById('restart-btn'); // 다시 시작 버튼
const timerElement = document.getElementById('timer'); // 타이머 표시 영역

// 게임 상태를 저장할 변수들입니다.
let board = []; // 2차원 배열로 보드 상태를 저장 (각 셀의 지뢰 여부, 열림 여부 등)
let rows = 5; // 보드의 가로 줄 수 (기본 1레벨: 5)
let cols = 5; // 보드의 세로 칸 수 (기본 1레벨: 5)
let totalMines = 5; // 전체 지뢰 개수 (기본 1레벨: 5)
let minesLeft = 5; // 화면에 표시될 남은 지뢰 개수
let gameOver = false; // 게임 종료 상태 (true면 클릭 안됨)
let cellsRevealed = 0; // 현재까지 열린 칸의 수 (승리 조건 체크용)

// 타이머 및 레벨 관련 변수
let currentLevel = 1; // 현재 레벨
let timerInterval = null; // 타이머를 반복 실행할 interval ID
let timeElapsed = 0; // 경과 시간 (초)
let gameStarted = false; // 첫 클릭 시 타이머 시작을 위한 변수
let score = 0; // 게임 점수

// 1. 레벨 설정 기능
// 사용자가 레벨 버튼을 누르면 호출됩니다. (이전 레벨에서 넘어올 때 점수를 유지할지 여부 keepScore)
function setLevel(level, keepScore = false) {
    currentLevel = level;
    if (level === 1) {
        rows = 5; cols = 5; totalMines = 5;
    } else if (level === 2) {
        rows = 9; cols = 9; totalMines = 10;
    } else if (level === 3) {
        rows = 24; cols = 32; totalMines = 99; // 전문가용 지뢰찾기 표준에 맞춰 지뢰 99개로 조정
    }
    initGame(keepScore); // 레벨이 바뀌면 게임을 새로 시작합니다.
}

// 레벨 버튼들에 클릭 이벤트를 달아줍니다.
levelButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // 모든 버튼에서 active 클래스(선택된 스타일)를 제거하고
        levelButtons.forEach(b => b.classList.remove('active'));
        // 방금 클릭한 버튼에만 active 클래스를 추가합니다.
        e.target.classList.add('active');
        
        // 버튼의 data-level 속성값을 숫자로 바꿔서 setLevel 함수로 넘깁니다.
        const level = parseInt(e.target.getAttribute('data-level'));
        setLevel(level);
    });
});

// 2. 게임 초기화 (다시 시작) 기능
// 게임을 처음 켜거나, 다시 시작할 때 호출됩니다.
function initGame(keepScore = false) {
    // 게임 변수들 초기화
    board = [];
    gameOver = false;
    cellsRevealed = 0;
    minesLeft = totalMines;
    gameStarted = false;
    timeElapsed = 0;
    
    // 점수 초기화 (다음 레벨로 넘어가는 게 아니라면 초기화)
    if (!keepScore) {
        score = 0;
    }
    
    // 타이머 초기화
    clearInterval(timerInterval);
    timerElement.innerText = "0";

    mineCountElement.innerText = minesLeft; // 화면에 남은 지뢰 수 갱신
    statusMessage.innerText = "게임을 시작하세요!"; // 상태 메시지 초기화
    restartBtn.innerText = "다시 시작"; // 버튼 텍스트 초기화
    
    // UI 초기화
    boardElement.innerHTML = ''; // 기존 보드를 모두 지웁니다.
    
    // CSS Grid 설정: 선택한 열(cols) 개수에 맞춰 그리드를 만듭니다.
    boardElement.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    
    // 보드 데이터 생성 및 화면에 그리기
    createBoard();
    
    // 지뢰 랜덤 배치
    placeMines();
}

// 3. 보드 생성 기능
// HTML 요소와 내부 데이터를 매칭하여 만듭니다.
function createBoard() {
    for (let r = 0; r < rows; r++) {
        let row = [];
        for (let c = 0; c < cols; c++) {
            // 셀에 대한 정보 객체를 만듭니다.
            let cellData = {
                r: r, // 행 번호
                c: c, // 열 번호
                isMine: false, // 지뢰인지 여부
                isRevealed: false, // 클릭해서 열렸는지 여부
                isFlagged: false, // 우클릭으로 깃발이 꽂혔는지 여부
                element: document.createElement('div') // 화면에 보여줄 HTML <div> 요소
            };
            
            // HTML 요소에 기본 클래스 'cell'을 추가합니다.
            cellData.element.classList.add('cell');
            
            // 좌클릭 시 셀 열기 이벤트 달기
            cellData.element.addEventListener('click', () => revealCell(cellData));
            
            // 우클릭 시 깃발 꽂기 이벤트 달기
            cellData.element.addEventListener('contextmenu', (e) => toggleFlag(cellData, e));
            
            // 완성된 요소를 보드(화면)에 추가합니다.
            boardElement.appendChild(cellData.element);
            row.push(cellData);
        }
        board.push(row); // 2차원 배열로 저장
    }
}

// 4. 지뢰 랜덤 배치 기능
// 지정된 갯수(totalMines)만큼 보드 곳곳에 지뢰를 숨깁니다.
function placeMines() {
    let minesPlaced = 0;
    while (minesPlaced < totalMines) {
        // 무작위 행과 열 번호를 뽑습니다.
        let r = Math.floor(Math.random() * rows);
        let c = Math.floor(Math.random() * cols);
        
        // 해당 위치에 지뢰가 없다면 지뢰를 심습니다.
        if (!board[r][c].isMine) {
            board[r][c].isMine = true;
            minesPlaced++;
        }
    }
}

// 5. 셀 열기(클릭) 기능
// 사용자가 특정 칸을 눌렀을 때 실행됩니다.
function revealCell(cellData) {
    // 게임이 끝났거나, 이미 열린 칸이거나, 깃발이 꽂힌 칸이면 아무 동작도 하지 않습니다.
    if (gameOver || cellData.isRevealed || cellData.isFlagged) return;

    // 첫 클릭 시 타이머 시작
    if (!gameStarted) {
        gameStarted = true;
        timerInterval = setInterval(() => {
            timeElapsed++;
            timerElement.innerText = timeElapsed;
        }, 1000);
    }

    // 셀을 열었다고 표시합니다.
    cellData.isRevealed = true;
    cellData.element.classList.add('revealed'); // CSS 스타일 변경(어두워짐)
    cellsRevealed++; // 열린 칸 개수 증가

    // 만약 지뢰를 눌렀다면? (패배)
    if (cellData.isMine) {
        cellData.element.classList.add('mine'); // 빨간색 지뢰 표시
        cellData.element.innerText = '💣'; // 지뢰 아이콘
        handleGameOver(false); // 게임 오버 처리
        return;
    }

    // 지뢰가 아닌 빈칸을 열었을 때만 10점 추가
    score += 10;

    // 지뢰가 아니라면, 주변(8방향)에 지뢰가 몇 개인지 계산합니다.
    let mineCount = countAdjacentMines(cellData.r, cellData.c);
    
    if (mineCount > 0) {
        // 주변에 지뢰가 있다면 숫자를 보여줍니다.
        cellData.element.innerText = mineCount;
        // 숫자에 따라 색상을 다르게 줍니다 (디자인 요소)
        if(mineCount === 1) cellData.element.style.color = "#3498db";
        if(mineCount === 2) cellData.element.style.color = "#2ecc71";
        if(mineCount === 3) cellData.element.style.color = "#e74c3c";
        if(mineCount > 3) cellData.element.style.color = "#9b59b6";
    } else {
        // 주변에 지뢰가 없다면(0이라면), 주변 칸들도 자동으로 엽니다. (연쇄 폭발 같은 기능)
        revealAdjacentCells(cellData.r, cellData.c);
    }

    // 승리 조건을 체크합니다. (전체 칸 수 - 지뢰 수 == 열린 칸 수)
    if (cellsRevealed === rows * cols - totalMines) {
        handleGameOver(true); // 승리 처리
    }
}

// 6. 주변 지뢰 개수 계산 기능
function countAdjacentMines(r, c) {
    let count = 0;
    // 클릭한 칸 주변 3x3 (가로 -1~+1, 세로 -1~+1) 칸을 검사합니다.
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            let nr = r + i;
            let nc = c + j;
            // 검사하려는 칸이 보드 범위 안에 있고, 그곳에 지뢰가 있다면 카운트 증가
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                if (board[nr][nc].isMine) {
                    count++;
                }
            }
        }
    }
    return count;
}

// 7. 주변 빈 칸 연쇄적으로 열기 기능
function revealAdjacentCells(r, c) {
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            let nr = r + i;
            let nc = c + j;
            // 보드 범위 안에 있는지 확인
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                let neighbor = board[nr][nc];
                // 아직 열리지 않은 빈 칸이라면 revealCell을 다시 호출 (재귀 호출)
                if (!neighbor.isRevealed) {
                    revealCell(neighbor);
                }
            }
        }
    }
}

// 8. 게임 오버 / 클리어 처리 기능
// isWin 값이 true면 승리, false면 패배입니다.
function handleGameOver(isWin) {
    gameOver = true; // 더 이상 클릭할 수 없도록 상태 변경
    clearInterval(timerInterval); // 타이머 정지

    if (isWin) {
        statusMessage.innerText = "w (승리!)";
        
        // 자동으로 다음 레벨로 넘어가는 로직
        if (currentLevel < 3) {
            statusMessage.innerText += " 잠시 후 다음 레벨로 넘어갑니다...";
            setTimeout(() => {
                const nextLevel = currentLevel + 1;
                levelButtons.forEach(b => b.classList.remove('active'));
                const nextBtn = document.querySelector(`.level-btn[data-level="${nextLevel}"]`);
                if(nextBtn) nextBtn.classList.add('active');
                
                setLevel(nextLevel, true); // true를 넘겨서 점수 유지
            }, 1500); // 1.5초 대기 후 이동
        } else {
            statusMessage.innerText += " 모든 레벨을 클리어했습니다! 🎉";
            restartBtn.innerText = "처음부터 다시";
        }
    } else {
        // 죽었을 때만 누적된 점수를 함께 표시해줍니다.
        statusMessage.innerText = "지뢰를 밟았습니다! 💥 최종 점수: " + score + "점";
        restartBtn.innerText = "다시 시작";
        
        // 지뢰를 밟아서 패배한 경우, 모든 지뢰의 위치를 보여줍니다.
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let cell = board[r][c];
                if (cell.isMine) {
                    cell.element.classList.add('revealed');
                    
                    if (cell.isFlagged) {
                        // 지뢰를 정확히 맞춘 깃발인 경우: 깃발 아이콘 유지하고 빨간색 테두리만 추가
                        cell.element.style.border = '2px solid #ff4757';
                    } else {
                        // 깃발이 없었던 지뢰인 경우: 폭탄 아이콘과 빨간 배경(mine 클래스) 추가
                        cell.element.classList.add('mine');
                        cell.element.innerText = '💣';
                    }
                }
            }
        }
    }
}

// 다시 시작 버튼 클릭 이벤트 달기 (수동 리셋)
restartBtn.addEventListener('click', () => {
    if (restartBtn.innerText === "처음부터 다시") {
        levelButtons.forEach(b => b.classList.remove('active'));
        document.querySelector(`.level-btn[data-level="1"]`).classList.add('active');
        setLevel(1, false); // 1레벨로 가면서 점수 초기화
    } else {
        initGame(false); // 수동으로 다시 시작 시 점수 초기화
    }
});

// 9. 깃발 꽂기(우클릭) 기능
// 마우스 우클릭 시 지뢰라고 생각되는 곳에 깃발을 꽂습니다.
function toggleFlag(cellData, event) {
    event.preventDefault(); // 기본 우클릭 메뉴(브라우저 메뉴)가 뜨지 않게 막습니다.
    
    // 게임이 끝났거나, 이미 열린 칸이면 동작하지 않습니다.
    if (gameOver || cellData.isRevealed) return;
    
    // 첫 클릭 시 타이머 시작
    if (!gameStarted) {
        gameStarted = true;
        timerInterval = setInterval(() => {
            timeElapsed++;
            timerElement.innerText = timeElapsed;
        }, 1000);
    }
    
    if (!cellData.isFlagged) {
        // 깃발이 없으면 꽂기
        cellData.isFlagged = true;
        cellData.element.classList.add('flagged');
        cellData.element.innerText = '🚩';
        minesLeft--; // 남은 지뢰 수 감소
    } else {
        // 깃발이 이미 있으면 제거하기
        cellData.isFlagged = false;
        cellData.element.classList.remove('flagged');
        cellData.element.innerText = '';
        minesLeft++; // 남은 지뢰 수 증가
    }
    mineCountElement.innerText = minesLeft; // 화면에 남은 지뢰 개수 업데이트
}

// 첫 화면 로딩 시 게임을 시작합니다.
initGame();
