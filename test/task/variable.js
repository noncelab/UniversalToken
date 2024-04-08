/**
 * 변수 조회를 위한 스크립트 파일
 * @dev 변수 조회 함수 호출로 컨트랙트 상호 작용 가능
 * @command node ./test/task/variable.js contractAddr manageFunction [함수별 파라미터]
 * @see 관련 문서: https://www.notion.so/noncelab/SC-b832d0deb6ee4431856bc10f19bf446b?pvs=4#d7cfe39dd6714705b45a4543f540a4ba
 */

const Web3 = require("web3");
const ABI = require("../../build/contracts/ERC1400.json").abi;
require("dotenv").config();

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_URL));
const signer = web3.eth.accounts.privateKeyToAccount(
  "0x" + process.env.PRIVATE_KEY
);

const handleError = (number) => {
  console.log(
    `Invalid arguments [${number}] (Refer to https://www.notion.so/noncelab/SC-b832d0deb6ee4431856bc10f19bf446b?pvs=4#d7cfe39dd6714705b45a4543f540a4ba)`
  );
};

// 인자 사전 검증
const argumentCheck = async () => {
  // 필요한 인자가 모두 입력되었는지 확인
  if (
    process.argv.length > 3 &&
    process.argv.slice(2).every((arg) => arg && arg.length > 0)
  ) {
    // CA 주소가 올바른지 확인
    if (web3.utils.isAddress(process.argv[2])) {
      let contractAddr = web3.utils.toChecksumAddress(process.argv[2]);
      let manageFunction = process.argv[3];
      let params = [];

      if (
        [
          "balanceOf",
          "partitionsOf",
          "totalSupplyByPartition",
          "controllersByPartition",
        ].includes(manageFunction)
      ) {
        // 토큰 잔액 조회, tokenHolder의 파티션 리스트 조회, 파티션별 총량 조회, 파티션별 controller 리스트 조회
        if (
          [
            "partitionsOf",
            "balanceOf",
            "totalSupplyByPartition",
            "controllersByPartition",
          ].includes(manageFunction) &&
          !process.argv[4]
        ) {
          // 1. partitionsOf 또는 balanceOf인 경우 targetTokenHolder를 입력했는지 확인
          // 2. totalSupplyByPartition 또는 controllersByPartition인 경우 partition을 입력했는지 확인
          handleError(1);
          return;
        }

        params.push(process.argv[4]);
      } else if (
        ["allowance", "balanceOfByPartition", "isOperator"].includes(
          manageFunction
        )
      ) {
        // 토큰 전송 승인량 조회, 파티션별 토큰 잔액 조회, operator 여부 조회
        if (
          ["allowance", "balanceOfByPartition", "isOperator"].includes(
            manageFunction
          ) &&
          (!process.argv[4] || !process.argv[5])
        ) {
          // 1. allowance인 경우 targetTokenHolder와 targetTokenSpender를 입력했는지 확인
          // 2. balanceOfByPartition인 경우 partition과 targetTokenHolder를 입력했는지 확인
          // 3. isOperator인 경우 operator와 targetTokenHolder를 입력했는지 확인
          handleError(2);
          return;
        }

        params.push(process.argv[4]);
        params.push(process.argv[5]);
      } else if (
        ["isOperatorForPartition", "allowanceByPartition"].includes(
          manageFunction
        )
      ) {
        // 파티션별 operator 여부 조회
        if (!process.argv[4] || !process.argv[5] || !process.argv[6]) {
          // 1. isOperatorForPartition인 경우 partition, operator와 targetTokenHolder를 입력했는지 확인
          // 2. allowanceByPartition인 경우 partition, targetTokenHolder와 targetTokenSpender를 입력했는지 확인
          handleError(3);
          return;
        }

        params.push(process.argv[4]);
        params.push(process.argv[5]);
        params.push(process.argv[6]);
      } else if (
        [
          "name",
          "symbol",
          "granularity",
          "isControllable",
          "isIssuable",
          "totalPartitions",
          "controllers",
        ].includes(manageFunction)
      ) {
        // 인자 없음
      } else handleError(4);

      return {
        contractAddr,
        manageFunction,
        params,
      };
    } else handleError(5);
  } else handleError(6);
};

// 변수 조회
const checkVariable = async (ca, code, params) => {
  // 관리자(서명자) 정보 추가
  web3.eth.accounts.wallet.add(signer);

  const contract = new web3.eth.Contract(ABI, ca);

  // 컨트랙트 전달 값 설정
  let deployTx = "";

  switch (code) {
    case "name":
      deployTx = contract.methods.name();
      break;
    case "symbol":
      deployTx = contract.methods.symbol();
      break;
    case "granularity":
      deployTx = contract.methods.granularity();
      break;
    case "isControllable":
      deployTx = contract.methods.isControllable();
      break;
    case "isIssuable":
      deployTx = contract.methods.isIssuable();
      break;
    case "balanceOf":
      deployTx = contract.methods.balanceOf(
        web3.utils.toChecksumAddress(params[0]) // targetTokenHolder
      );
      break;
    case "allowance":
      deployTx = contract.methods.allowance(
        web3.utils.toChecksumAddress(params[0]), // targetTokenHolder
        web3.utils.toChecksumAddress(params[1]) // targetTokenSpender
      );
      break;
    case "totalPartitions":
      deployTx = contract.methods.totalPartitions();
      break;
    case "totalSupplyByPartition":
      deployTx = contract.methods.totalSupplyByPartition(
        web3.utils.toHex(params[0]).padEnd(66, "0") // partition
      );
      break;
    case "partitionsOf":
      deployTx = contract.methods.partitionsOf(
        web3.utils.toChecksumAddress(params[0]) // targetTokenHolder
      );
      break;
    case "balanceOfByPartition":
      deployTx = contract.methods.balanceOfByPartition(
        web3.utils.toHex(params[0]).padEnd(66, "0"), // partition
        web3.utils.toChecksumAddress(params[1]) // targetTokenHolder
      );
      break;
    case "allowanceByPartition":
      deployTx = contract.methods.allowanceByPartition(
        web3.utils.toHex(params[0]).padEnd(66, "0"), // partition
        web3.utils.toChecksumAddress(params[1]), // targetTokenHolder
        web3.utils.toChecksumAddress(params[2]) // targetTokenSpender
      );
      break;
    case "isOperator":
      deployTx = contract.methods.isOperator(
        web3.utils.toChecksumAddress(params[0]), // operator
        web3.utils.toChecksumAddress(params[1]) // targetTokenHolder
      );
      break;
    case "isOperatorForPartition":
      deployTx = contract.methods.isOperatorForPartition(
        web3.utils.toHex(params[0]).padEnd(66, "0"), // partition
        web3.utils.toChecksumAddress(params[1]), // operator
        web3.utils.toChecksumAddress(params[2]) // targetTokenHolder
      );
      break;
    case "controllers":
      deployTx = contract.methods.controllers();
      break;
    case "controllersByPartition":
      deployTx = contract.methods.controllersByPartition(
        web3.utils.toHex(params[0]).padEnd(66, "0") // partition
      );
      break;
  }

  const result = await deployTx.call();

  console.log(`Result (${code}):`, result);
  return result;
};

const test = async () => {
  const parameterObject = await argumentCheck();

  if (parameterObject) {
    console.log(`Trying to call ${parameterObject.manageFunction}...`);

    await checkVariable(
      parameterObject.contractAddr,
      parameterObject.manageFunction,
      parameterObject.params
    );
  }
};

test();
