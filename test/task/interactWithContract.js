/**
 * 컨트랙트 직접 호출을 위한 스크립트 파일
 * @dev 미들웨어를 거치지 않고 직접 컨트랙트를 호출하여 컨트랙트와 상호 작용 가능
 * @command node ./test/task/interactWithContract.js contractAddr manageFunction [함수별 파라미터]
 * @see Call 관련 문서: https://www.notion.so/noncelab/SC-call-data-c5a27a3a86fb413888c1622af5cccc29?pvs=4#826b2eee92f1450ba1b6e5a267227523
 * @see Send 관련 문서: https://www.notion.so/noncelab/SC-sending-txs-5b5d6a1cd3db4f7b9ee17f72c5f35af2?pvs=4#cb545e5cd8964c0bb6c63ce449433ab7
 */

const readLine = require("readline");
const Web3 = require("web3");
const { callFunctions, sendFunctions } = require("./functionConstant");
const ABI = require("../../build/contracts/ERC1400.json").abi;
require("dotenv").config();

const readInput = readLine.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_URL));
let contract;

const handleError = (number, type) => {
  console.log(
    `Invalid arguments [${number}] (Refer to ${
      type === "call"
        ? "https://www.notion.so/noncelab/SC-call-data-c5a27a3a86fb413888c1622af5cccc29?pvs=4#826b2eee92f1450ba1b6e5a267227523"
        : "https://www.notion.so/noncelab/SC-sending-txs-5b5d6a1cd3db4f7b9ee17f72c5f35af2?pvs=4#cb545e5cd8964c0bb6c63ce449433ab7"
    })`
  );
};

/**
 * @dev 컨트랙트 주소와 컨트랙트에서 호출 가능한 함수명을 띄어쓰기를 기준으로 순서대로 입력합니다.
 * @param {string} contractAddr - 컨트랙트 주소
 * @param {string} name - 호출하고자 하는 함수명
 */
const functionCheck = () => {
  let input;

  readInput.question(
    "Please enter contract address and a function name in order (Split by space): ",
    (name) => {
      input = name.trim().split(" ");

      // 컨트랙트 주소와 함수명을 입력하고, 컨트랙트 주소가 올바른 주소 형식인 경우
      if (
        input.length === 2 &&
        web3.utils.isAddress(web3.utils.toChecksumAddress(input[0]))
      ) {
        // 컨트랙트 내에 포함되어 있는 올바른 함수명을 입력한 경우
        if ([...callFunctions, ...sendFunctions].includes(input[1])) {
          if (
            [
              "name",
              "symbol",
              "granularity",
              "isControllable",
              "isIssuable",
              "totalPartitions",
              "controllers",
              "totalSupply",
            ].includes(input[1])
          ) {
            // 파라미터가 필요 없는 함수인 경우
            connectArgument(input);
            readInput.close();
          } else inputArgument(input);
        } else {
          console.log(
            "Function name is invalid. Please check the function name again."
          );
          readInput.close();
        }
      } else {
        console.log(
          "Either contract address or function name is invalid. Please check them again."
        );
        readInput.close();
      }
    }
  );
};

/**
 * @dev 함수별로 필요한 인자를 띄어쓰기를 기준으로 순서대로 입력하고, 각 함수에 맞는 인자를 확인합니다.
 * @param {string[]} parameters - 이전에 입력한 함수에 필요한 인자
 **/
const inputArgument = async (input) => {
  let argumentInput;

  readInput.question(
    "\nPlease enter parameters for corresponding function in order (Split by space): ",
    (parameters) => {
      argumentInput =
        parameters.trim().length > 0 ? parameters.trim().split(" ") : null;
      connectArgument(input, argumentInput);

      readInput.close();
    }
  );
};

/**
 * @dev 입력받은 인자를 입력한 함수에 연결합니다.
 */
const connectArgument = (input, parameters) => {
  contract = new web3.eth.Contract(ABI, web3.utils.toChecksumAddress(input[0]));

  switch (input[1]) {
    // Call functions
    case "name":
      name();
      break;
    case "symbol":
      symbol();
      break;
    case "granularity":
      granularity();
      break;
    case "controllers":
      controllers();
      break;
    case "controllersByPartition":
      controllersByPartition(parameters);
      break;
    case "totalPartitions":
      totalPartitions();
      break;
    case "partitionsOf":
      partitionsOf(parameters);
      break;
    case "totalSupply":
      totalSupply();
      break;
    case "totalSupplyByPartition":
      totalSupplyByPartition(parameters);
      break;
    case "isIssuable":
      isIssuable();
      break;
    case "isControllable":
      isControllable();
      break;
    case "isMinter":
      isMinter(parameters);
      break;
    case "isOperator":
      isOperator(parameters);
      break;
    case "isOperatorForPartition":
      isOperatorForPartition(parameters);
      break;
    case "balanceOf":
      balanceOf(parameters);
      break;
    case "balanceOfByPartition":
      balanceOfByPartition(parameters);
      break;
    case "allowance":
      allowance(parameters);
      break;
    case "allowanceByPartition":
      allowanceByPartition(parameters);
      break;

    // Send functions
    case "authorizeOperator":
      break;
    case "revokeOperator":
      break;
    case "authorizeOperatorByPartition":
      break;
    case "revokeOperatorByPartition":
      break;
    case "approve":
      break;
    case "approveByPartition":
      break;
    case "transfer":
      break;
    case "transferWithData":
      break;
    case "transferFrom":
      break;
    case "transferFromWithData":
      break;
    case "transferByPartition":
      break;
    case "operatorTransferByPartition":
      break;
    case "redeem":
      break;
    case "redeemByPartition":
      break;
    case "redeemFrom":
      break;
    case "operatorRedeemByPartition":
      break;
  }
};

// ####################################################
//                      컨트랙트 호출
// ####################################################

/**
 * @dev ERC-1400 컨트랙트의 name 함수를 호출하여 토큰의 이름을 조회합니다.
 * @return {string} _name
 */
const name = async () => {
  const result = await contract.methods.name().call();

  console.log(result);

  return result;
};

/**
 * @dev ERC-1400 컨트랙트의 symbol 함수를 호출하여 토큰의 심볼을 조회합니다.
 * @return {string} _symbol
 */
const symbol = async () => {
  const result = await contract.methods.symbol().call();

  console.log(result);

  return result;
};

/**
 * @dev ERC-1400 컨트랙트의 granularity 함수를 호출하여 토큰의 최소(분할 가능)단위를 조회합니다.
 * @return {uint256} _granularity
 */
const granularity = async () => {
  const result = await contract.methods.granularity().call();

  console.log(Number(result));

  return Number(result);
};

/**
 * @dev ERC-1400 컨트랙트의 controllers 함수를 호출하여 전체 컨트롤러 리스트를 조회합니다.
 * @return {address[]} _controllers
 */
const controllers = async () => {
  const result = await contract.methods.controllers().call();

  console.log(result);

  return result;
};

/**
 * @dev ERC-1400 컨트랙트의 controllersByPartition 함수를 호출하여 전체 파티션별 컨트롤러 리스트를 조회합니다.
 * @param {string} partition - 파티션
 * @return {address[]} _controllersByPartition[partition]
 */
const controllersByPartition = async (params) => {
  if (params && params.length === 1 && params[0].length > 0) {
    const result = await contract.methods
      .controllersByPartition(web3.utils.toHex(params[0]).padEnd(66, "0"))
      .call();

    console.log(result);

    return result;
  } else handleError(1, "call");
};

/**
 * @dev ERC-1400 컨트랙트의 totalPartitions 함수를 호출하여 전체 파티션 리스트를 조회합니다.
 * @return {string[]} _totalPartitions
 */
const totalPartitions = async () => {
  const result = await contract.methods.totalPartitions().call();
  let tempResult = [];

  if (result && result.length > 0) {
    for (let i = 0; i < result.length; i++) {
      tempResult.push(web3.utils.hexToUtf8(result[i]));
    }
  }

  console.log(tempResult);

  return tempResult;
};

/**
 * @dev ERC-1400 컨트랙트의 partitionsOf 함수를 호출하여 조회 대상의 파티션 리스트를 조회합니다.
 * @param {address} tokenHolder - 조회 대상의 주소
 * @return {string[]} _partitionsOf[tokenHolder]
 */
const partitionsOf = async (params) => {
  if (params && params.length === 1 && web3.utils.isAddress(params[0])) {
    const result = await contract.methods
      .partitionsOf(web3.utils.toChecksumAddress(params[0]))
      .call();
    let tempResult = [];

    if (result && result.length > 0) {
      for (let i = 0; i < result.length; i++) {
        tempResult.push(web3.utils.hexToUtf8(result[i]));
      }
    }

    console.log(tempResult);

    return tempResult;
  } else handleError(2, "call");
};

/**
 * @dev ERC-1400 컨트랙트의 totalSupply 함수를 호출하여 토큰의 총 개수를 조회합니다.
 * @return {uint256} _totalSupply
 */
const totalSupply = async () => {
  const result = await contract.methods.totalSupply().call();

  console.log(Number(result));

  return Number(result);
};

/**
 * @dev ERC-1400 컨트랙트의 totalSupplyByPartition 함수를 호출하여 파티션별 총 토큰 개수를 조회합니다.
 * @param {string} partition - 파티션
 * @return {uint256} _totalSupplyByPartition[partition]
 */
const totalSupplyByPartition = async (params) => {
  if (params && params.length === 1 && params[0].length > 0) {
    const result = await contract.methods
      .totalSupplyByPartition(web3.utils.toHex(params[0]).padEnd(66, "0"))
      .call();

    console.log(Number(result));

    return Number(result);
  } else handleError(3, "call");
};

/**
 * @dev ERC-1400 컨트랙트의 isIssuable 함수를 호출하여 minter에 의해 토큰이 발행될 수 있는지
 *      여부를 조회합니다. 초기 설정 값은 true이며, 이를 변경하기 위해서는 renounceIssuance 함수를 호출해야 합니다.
 * @return {bool} _isIssuable
 */
const isIssuable = async () => {
  const result = await contract.methods.isIssuable().call();

  console.log(result);

  return result;
};

/**
 * @dev ERC-1400 컨트랙트의 isControllable 함수를 호출하여 operator에 의해 토큰 동작이 제어될 수 있는지
 *      여부를 조회합니다. 초기 설정 값은 true이며, 이를 변경하기 위해서는 renounceControl 함수를 호출해야 합니다.
 * @return {bool} _isControllable
 */
const isControllable = async () => {
  const result = await contract.methods.isControllable().call();

  console.log(result);

  return result;
};

/**
 * @dev ERC-1400 컨트랙트의 isMinter 함수를 호출하여 조회 대상이 minter인지 조회합니다.
 * @param {address} account - 조회 대상의 주소
 * @return {bool} _minters.has(account)
 */
const isMinter = async (params) => {
  if (params && params.length === 1 && web3.utils.isAddress(params[0])) {
    const result = await contract.methods
      .isMinter(web3.utils.toChecksumAddress(params[0]))
      .call();

    console.log(result);

    return result;
  }
};

/**
 * @dev ERC-1400 컨트랙트의 isOperator 함수를 호출하여 제어 권한자가 조회 대상의 operator인지 조회합니다.
 * @param {address} operator - 제어 권한자의 주소
 * @param {address} tokenHolder - 조회 대상의 주소
 * @return {bool} _isOperator(operator, tokenHolder)
 */
const isOperator = async (params) => {
  if (
    params &&
    params.length === 2 &&
    web3.utils.isAddress(params[0]) &&
    web3.utils.isAddress(params[1])
  ) {
    const result = await contract.methods
      .isOperator(
        web3.utils.toChecksumAddress(params[0]),
        web3.utils.toChecksumAddress(params[1])
      )
      .call();

    console.log(result);

    return result;
  } else handleError(4, "call");
};

/**
 * @dev ERC-1400 컨트랙트의 isOperatorForPartition 함수를 호출하여 파티션별 제어 권한자가 조회 대상의 operator인지 조회합니다.
 * @param {string} partition - 파티션
 * @param {address} operator - 제어 권한자의 주소
 * @param {address} tokenHolder - 조회 대상의 주소
 * @return {bool} _isOperatorForPartition(partition, operator, tokenHolder)
 */
const isOperatorForPartition = async (params) => {
  if (
    params &&
    params.length === 3 &&
    params[0].length > 0 &&
    web3.utils.isAddress(params[1]) &&
    web3.utils.isAddress(params[2])
  ) {
    const result = await contract.methods
      .isOperatorForPartition(
        web3.utils.toHex(params[0]).padEnd(66, "0"),
        web3.utils.toChecksumAddress(params[1]),
        web3.utils.toChecksumAddress(params[2])
      )
      .call();

    console.log(result);

    return result;
  } else handleError(5, "call");
};

/**
 * @dev ERC-1400 컨트랙트의 balanceOf 함수를 호출하여 조회 대상의 토큰 개수를 조회합니다.
 * @param {address} tokenHolder - 조회 대상의 주소
 * @return {uint256} _balances[tokenHolder]
 */
const balanceOf = async (params) => {
  if (params && params.length === 1 && web3.utils.isAddress(params[0])) {
    const result = await contract.methods.balanceOf(params[0]).call();

    console.log(Number(result));

    return Number(result);
  } else handleError(6, "call");
};

/**
 * @dev ERC-1400 컨트랙트의 balanceOfByPartition 함수를 호출하여 파티션별 조회 대상의 토큰 개수를 조회합니다.
 * @param {string} partition - 파티션
 * @param {address} tokenHolder - 조회 대상의 주소
 * @return {uint256} _balanceOfByPartition[tokenHolder][partition]
 */
const balanceOfByPartition = async (params) => {
  if (
    params &&
    params.length === 2 &&
    params[0].length > 0 &&
    web3.utils.isAddress(params[1])
  ) {
    const result = await contract.methods
      .balanceOfByPartition(
        web3.utils.toHex(params[0]).padEnd(66, "0"),
        web3.utils.toChecksumAddress(params[1])
      )
      .call();

    console.log(Number(result));

    return Number(result);
  } else handleError(7, "call");
};

/**
 * @dev ERC-1400 컨트랙트의 allowance 함수를 호출하여 사용 대상이 제어할 수 있는 조회 대상의 토큰 개수를 조회합니다.
 * @param {address} owner - 조회 대상의 주소
 * @param {address} spender - 조회 대상의 주소
 * @return {uint256} _allowed[owner][spender]
 */
const allowance = async (params) => {
  if (
    params &&
    params.length === 2 &&
    web3.utils.isAddress(params[0]) &&
    web3.utils.isAddress(params[1])
  ) {
    const result = await contract.methods
      .allowance(params[0], params[1])
      .call();

    console.log(Number(result));

    return Number(result);
  } else handleError(8, "call");
};

/**
 * @dev ERC-1400 컨트랙트의 allowanceByPartition 함수를 호출하여 파티션별 사용 대상이 제어할 수 있는
 *      조회 대상의 토큰 개수를 조회합니다.
 * @param {string} partition - 파티션
 * @param {address} owner - 조회 대상의 주소
 * @param {address} spender - 사용 대상의 주소
 * @return {uint256} _allowanceByPartition[partition][owner][spender]
 */
const allowanceByPartition = async (params) => {
  if (
    params &&
    params.length === 3 &&
    params[0].length > 0 &&
    web3.utils.isAddress(params[1]) &&
    web3.utils.isAddress(params[2])
  ) {
    const result = await contract.methods
      .allowanceByPartition(
        web3.utils.toHex(params[0]).padEnd(66, "0"),
        web3.utils.toChecksumAddress(params[1]),
        web3.utils.toChecksumAddress(params[2])
      )
      .call();

    console.log(Number(result));

    return Number(result);
  } else handleError(9, "call");
};

// ####################################################
//                      트랜잭션 전송
// ####################################################

/**
 * @dev 컨트랙트로의 트랜잭션 전송을 위해서는 요청자의 서명이 필요합니다. 이를 위해 요청자의 니모닉을 입력 받습니다.
 * @param {string} mnemonic - 니모닉
 */
const getMnemonic = () => {
  readInput.question("Please enter your mnemonic to process: ", (mnemonic) => {
    console.log("mnemonic", mnemonic);
    readInput.close();
  });
};

const init = () => {
  functionCheck();
};

init();
