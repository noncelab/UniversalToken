/**
 * 블록체인 트랜잭션 이벤트 감지를 위한 스크립트 파일
 * @dev 이벤트가 포함되어 있는 함수 호출로 이벤트 감지 기능 실행
 * @command node ./test/task/eventListener.js contractAddr manageFunction
 * @see 관련 문서: https://www.notion.so/noncelab/API-SC-e965212c52ef462fad22ed2bcc5b2e93?pvs=4
 */

const Web3 = require("web3");
const { eventFunctions } = require("./functionConstant");
const ABI = require("../../build/contracts/ERC1400.json").abi;
const readLine = require("readline");
require("dotenv").config();

const readInput = readLine.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const web3 = new Web3(new Web3.providers.WebsocketProvider(process.env.WS_URL));

/**
 * @dev 컨트랙트 주소와 컨트랙트에서 호출 가능한 함수명을 띄어쓰기를 기준으로 순서대로 입력합니다.
 * @param {string} contractAddr - 컨트랙트 주소
 * @param {string} name - 이벤트를 감지하고자 하는 함수명
 */
const functionCheck = () => {
  let input;

  readInput.question(
    `Please enter contract address and a function name to capture events\n: `,
    (name) => {
      input = name.trim().split(" ");

      // 컨트랙트 주소와 함수명을 입력하고, 컨트랙트 주소가 올바른 주소 형식인 경우
      if (
        input.length === 2 &&
        web3.utils.isAddress(web3.utils.toChecksumAddress(input[0]))
      ) {
        // 이벤트가 포함된 올바른 함수명을 입력한 경우
        if (eventFunctions.includes(input[1])) {
          connectFunction(input);
          readInput.close();
        } else {
          console.log(
            "Error: Function name is invalid or not supported. Please check the function name again."
          );
          readInput.close();
          return;
        }
      } else {
        console.log(
          "Error: Either contract address or function name is invalid or not supported. Please check them again."
        );
        readInput.close();
        return;
      }
    }
  );
};

/**
 * @dev 특정 컨트랙트 주소의 함수별 이벤트 구독 및 이벤트 감지
 **/
const subscribeEvent = async (input, params) => {
  let contractAddr = web3.utils.toChecksumAddress(input[0]);
  let contract = new web3.eth.Contract(ABI, contractAddr);

  console.log(`Listening event [${params}]...`);

  contract.events[params]({}, (error, event) => {
    if (!error) {
      console.log(`[${params}] event has occurred`, event.returnValues);
      // 여기서 원하는 작업 수행
    } else {
      console.error("Error:", error);
    }
  });
};

/**
 * @dev 입력받은 값을 입력한 함수에 연결합니다.
 */
const connectFunction = (input) => {
  switch (input[1]) {
    case "addMinter":
      subscribeEvent(input, "MinterAdded");
      break;
    case "removeMinter":
      subscribeEvent(input, "MinterRemoved");
      break;
    case "approve":
      subscribeEvent(input, "Approval");
      break;
    case "setDocument":
      subscribeEvent(input, "DocumentUpdated");
      break;
    case "removeDocument":
      subscribeEvent(input, "DocumentRemoved");
      break;
    case "authorizeOperator":
      subscribeEvent(input, "AuthorizedOperator");
      break;
    case "revokeOperator":
      subscribeEvent(input, "RevokedOperator");
      break;
    case "authorizeOperatorByPartition":
      subscribeEvent(input, "AuthorizedOperatorByPartition");
      break;
    case "revokeOperatorByPartition":
      subscribeEvent(input, "RevokedOperatorByPartition");
      break;
    case "approveByPartition":
      subscribeEvent(input, "ApprovalByPartition");
      break;
    case "transfer":
      subscribeEvent(input, "Transfer");
      break;
    case "transferByPartition":
      subscribeEvent(input, "TransferByPartition");
      subscribeEvent(input, "ChangedPartition");
      break;
    case "issue":
      subscribeEvent(input, "Issued");
      break;
    case "issueByPartition":
      subscribeEvent(input, "IssuedByPartition");
      break;
    case "redeem":
      subscribeEvent(input, "Redeemed");
      break;
    case "redeemByPartition":
      subscribeEvent(input, "RedeemedByPartition");
      break;
  }
};

const init = () => {
  functionCheck();
};

init();

// web3.currentProvider.connection.close();
