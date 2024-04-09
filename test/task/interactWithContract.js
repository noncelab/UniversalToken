/**
 * 컨트랙트 직접 호출을 위한 스크립트 파일
 * @dev 미들웨어를 거치지 않고 직접 컨트랙트를 호출하여 컨트랙트와 상호 작용 가능
 * @command node ./test/task/interactWithContract.js contractAddr manageFunction [함수별 파라미터]
 * @see Call 관련 문서: https://www.notion.so/noncelab/SC-call-data-c5a27a3a86fb413888c1622af5cccc29?pvs=4#826b2eee92f1450ba1b6e5a267227523
 * @see Send 관련 문서: https://www.notion.so/noncelab/SC-sending-txs-5b5d6a1cd3db4f7b9ee17f72c5f35af2?pvs=4#cb545e5cd8964c0bb6c63ce449433ab7
 */

const {
  callFunctions,
  sendFunctions,
  callFunctionsForStepPass,
} = require("./functionConstant");
const readLine = require("readline");
const Web3 = require("web3");
const ABI = require("../../build/contracts/ERC1400.json").abi;
const bip39 = require("bip39");
const ethers = require("ethers");
require("dotenv").config();

let dataTypeForOperatorTransferByPartition = { type: null, value: null };

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

  // 함수명이 operatorTransferByPartition인 경우에는 선택적으로 입력 가능한 데이터 타입이 2가지(data, operatorData) 있습니다.
  // 입력을 하지 않을 수도 있지만, 한 가지만 입력하는 경우에는 이를 구분하기 위해 추가적으로 입력을 받아 처리합니다.
  readInput.question(
    `Please enter contract address and a function name in order (Split by space)\n(* If the function name is "operatorTransferByPartition" and there is only one data type(either data or operatorData), just input it regardless of the order and input what it is in the command that comes right after this)\n: `,
    (name) => {
      if (name) {
        input = name.trim().split(" ");

        // 컨트랙트 주소와 함수명을 입력하고, 컨트랙트 주소가 올바른 주소 형식인 경우
        if (
          input.length === 2 &&
          web3.utils.isAddress(web3.utils.toChecksumAddress(input[0]))
        ) {
          // 컨트랙트 내에 포함되어 있는 올바른 함수명을 입력한 경우
          if ([...callFunctions, ...sendFunctions].includes(input[1])) {
            if (callFunctionsForStepPass.includes(input[1])) {
              // 파라미터가 필요 없는 함수인 경우
              connectArgument(input);
              readInput.close();
            } else inputArgument(input);
          } else {
            console.log(
              "Error: Function name is invalid. Please check the function name again."
            );
            readInput.close();
          }
        } else {
          console.log(
            "Error: Either contract address or function name is invalid. Please check them again."
          );
          readInput.close();
        }
      } else {
        console.log(
          "Error: No input is entered. Please check the input parameters again."
        );
        readInput.close();
      }
    }
  );
};

// 인자 연결 중복 함수 재사용
const handleConnectArgument = (input, argumentInput) => {
  connectArgument(input, argumentInput);

  // sendFunction의 경우 니모닉 입력을 추가로 받아야 하기 때문에 callFunction인 경우에만 readInput close 처리
  if (
    !sendFunctions.includes(input[1]) ||
    !sendFunctionArgumentCheck(input, argumentInput)
  )
    readInput.close();
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
      if (parameters) {
        argumentInput =
          parameters.trim().length > 0 ? parameters.trim().split(" ") : null;

        // operatorTransferByPartition 선택 후 data 또는 operatorData 둘 중 하나만 입력한 경우
        if (
          input[1] === "operatorTransferByPartition" &&
          argumentInput[4] &&
          !argumentInput[5]
        ) {
          readInput.question(
            "\nPlease enter dataType (data, operatorData): ",
            (dataType) => {
              if (["data", "operatorData"].includes(dataType)) {
                dataTypeForOperatorTransferByPartition = dataType;
                handleConnectArgument(input, argumentInput);
              } else {
                console.log(
                  "Error: DataType is invalid. Please check the inputtable dataType again."
                );

                readInput.close();
                return;
              }
            }
          );
        } else handleConnectArgument(input, argumentInput);
      } else {
        console.log(
          "Error: No input is entered. Please check the input parameters again."
        );
        readInput.close();
      }
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
      getMnemonic(parameters, authorizeOperator);
      break;
    case "revokeOperator":
      getMnemonic(parameters, revokeOperator);
      break;
    case "authorizeOperatorByPartition":
      getMnemonic(parameters, authorizeOperatorByPartition);
      break;
    case "revokeOperatorByPartition":
      getMnemonic(parameters, revokeOperatorByPartition);
      break;
    case "approve":
      getMnemonic(parameters, approve);
      break;
    case "approveByPartition":
      getMnemonic(parameters, approveByPartition);
      break;
    case "transfer":
      getMnemonic(parameters, transfer);
      break;
    case "transferWithData":
      getMnemonic(parameters, transferWithData);
      break;
    case "transferFrom":
      getMnemonic(parameters, transferFrom);
      break;
    case "transferFromWithData":
      getMnemonic(parameters, transferFromWithData);
      break;
    case "transferByPartition":
      getMnemonic(parameters, transferByPartition);
      break;
    case "operatorTransferByPartition":
      getMnemonic(parameters, operatorTransferByPartition);
      break;
    case "redeem":
      getMnemonic(parameters, redeem);
      break;
    case "redeemByPartition":
      getMnemonic(parameters, redeemByPartition);
      break;
    case "redeemFrom":
      getMnemonic(parameters, redeemFrom);
      break;
    case "operatorRedeemByPartition":
      getMnemonic(parameters, operatorRedeemByPartition);
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
 * @dev ERC-1400 컨트랙트의 isOperatorForPartition 함수를 호출하여 파티션별 제어 권한자가 조회 대상의
 *      operator인지 조회합니다.
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
 * @dev Send 함수별 인자의 개수와 형태가 올바른지 사전 검증합니다.
 */
const sendFunctionArgumentCheck = (input, params) => {
  let functionName = input[1];

  if (["authorizeOperator", "revokeOperator"].includes(functionName)) {
    if (params && params.length === 1 && web3.utils.isAddress(params[0]))
      return true;
    else handleError(10, "send");
  } else if (
    ["authorizeOperatorByPartition", "revokeOperatorByPartition"].includes(
      functionName
    )
  ) {
    if (
      params &&
      params.length === 2 &&
      params[0].length > 0 &&
      web3.utils.isAddress(params[1])
    )
      return true;
    else handleError(11, "send");
  } else if (["approve", "transfer"].includes(functionName)) {
    if (
      params &&
      params.length === 2 &&
      web3.utils.isAddress(params[0]) &&
      !isNaN(params[1])
    )
      return true;
    else handleError(12, "send");
  } else if (functionName === "approveByPartition") {
    if (
      params &&
      params.length === 3 &&
      params[0].length > 0 &&
      web3.utils.isAddress(params[1]) &&
      !isNaN(params[2])
    )
      return true;
    else handleError(13, "send");
  } else if (functionName === "transferWithData") {
    if (
      params &&
      params.length === 3 &&
      web3.utils.isAddress(params[0]) &&
      !isNaN(params[1]) &&
      params[2].length > 0
    )
      return true;
    else handleError(14, "send");
  } else if (functionName === "transferFrom") {
    if (
      params &&
      params.length === 3 &&
      web3.utils.isAddress(params[0]) &&
      web3.utils.isAddress(params[1]) &&
      !isNaN(params[2])
    )
      return true;
    else handleError(15, "send");
  } else if (functionName === "transferFromWithData") {
    if (
      params &&
      params.length === 4 &&
      web3.utils.isAddress(params[0]) &&
      web3.utils.isAddress(params[1]) &&
      !isNaN(params[2]) &&
      params[3].length > 0
    )
      return true;
    else handleError(16, "send");
  } else if (functionName === "transferByPartition") {
    if (
      params &&
      params.length >= 3 &&
      params[0].length > 0 &&
      web3.utils.isAddress(params[1]) &&
      !isNaN(params[2])
    )
      return true;
    else handleError(17, "send");
  } else if (functionName === "operatorTransferByPartition") {
    if (
      params &&
      params.length >= 4 &&
      params[0].length > 0 &&
      web3.utils.isAddress(params[1]) &&
      web3.utils.isAddress(params[2]) &&
      !isNaN(params[3])
    )
      return true;
    else handleError(18, "send");
  } else if (functionName === "redeem") {
    if (params && params.length >= 1 && !isNaN(params[0])) return true;
    else handleError(19, "send");
  } else if (functionName === "redeemByPartition") {
    if (
      params &&
      params.length >= 2 &&
      params[0].length > 0 &&
      !isNaN(params[1])
    )
      return true;
    else handleError(20, "send");
  } else if (functionName === "redeemFrom") {
    if (
      params &&
      params.length >= 2 &&
      web3.utils.isAddress(params[0]) &&
      !isNaN(params[1])
    )
      return true;
    else handleError(21, "send");
  } else if (functionName === "operatorRedeemByPartition") {
    if (
      params &&
      params.length >= 3 &&
      params[0].length > 0 &&
      web3.utils.isAddress(params[1]) &&
      !isNaN(params[2])
    )
      return true;
    else handleError(22, "send");
  }

  return false;
};

/**
 * @dev 컨트랙트로의 트랜잭션 전송을 위해서는 요청자의 서명이 필요합니다. 이를 위해 요청자의 니모닉을 입력 받습니다.
 * @param {string} mnemonic - 니모닉
 * @return {function} Callback function with signer object
 */
const getMnemonic = (params, callback) => {
  readInput.question(
    "\nPlease enter your mnemonic to process (Split by space): ",
    (mnemonic) => {
      let tempMnemonic = mnemonic.trim().split(" ");
      let result = null;

      if (tempMnemonic.length > 0 && bip39.validateMnemonic(mnemonic.trim())) {
        const wallet = ethers.Wallet.fromPhrase(mnemonic.trim());
        const signer = web3.eth.accounts.privateKeyToAccount(wallet.privateKey);

        web3.eth.accounts.wallet.add(signer);
        callback(signer, params);
      } else {
        console.log(
          "Error: Invalid mnemonic. Please check your mnemonic again."
        );
        result = false;
      }

      readInput.close();

      return result;
    }
  );
};

/**
 * @dev 블록체인 네트워크로 트랜잭션을 전송하고 결과를 반환합니다.
 * @param {object} tx - Transaction object
 * @return {object} Transaction receipt
 */
const sendTransaction = async (signer, tx) => {
  await tx
    .send({
      from: signer.address,
      gas: await tx.estimateGas({ from: signer.address }),
    })
    .once("transactionHash", (txHash) => {
      console.log("TxHash:", txHash);
    })
    .once("receipt", (result) => {
      console.log("Result:", result);

      return result;
    });
};

/**
 * @dev ERC-1400 컨트랙트의 authorizeOperator 함수를 호출하여 제어 권한자에 대한 operator 권한을 부여합니다.
 * @param {address} operator - 제어 권한자의 주소
 */
const authorizeOperator = async (signer, params) => {
  const tx = contract.methods.authorizeOperator(params[0]);

  sendTransaction(signer, tx);
};

/**
 * @dev ERC-1400 컨트랙트의 revokeOperator 함수를 호출하여 제어 권한자에 대한 operator 권한을 해제합니다.
 * @param {address} operator - 제어 권한자의 주소
 */
const revokeOperator = async (signer, params) => {
  const tx = contract.methods.revokeOperator(params[0]);

  sendTransaction(signer, tx);
};

/**
 * @dev ERC-1400 컨트랙트의 authorizeOperatorByPartition 함수를 호출하여 파티션별 제어 권한자에 대한
 *      operator 권한을 부여합니다.
 * @param {string} partition - 파티션
 * @param {address} operator - 제어 권한자의 주소
 */
const authorizeOperatorByPartition = async (signer, params) => {
  const tx = contract.methods.authorizeOperatorByPartition(
    web3.utils.toHex(params[0]).padEnd(66, "0"),
    web3.utils.toChecksumAddress(params[1])
  );

  sendTransaction(signer, tx);
};

/**
 * @dev ERC-1400 컨트랙트의 revokeOperatorByPartition 함수를 호출하여 파티션별 제어 권한자에 대한
 *      operator 권한을 해제합니다.
 * @param {string} partition - 파티션
 * @param {address} operator - 제어 권한자의 주소
 */
const revokeOperatorByPartition = async (signer, params) => {
  const tx = contract.methods.revokeOperatorByPartition(
    web3.utils.toHex(params[0]).padEnd(66, "0"),
    web3.utils.toChecksumAddress(params[1])
  );

  sendTransaction(signer, tx);
};

/**
 * @dev ERC-1400 컨트랙트의 approve 함수를 호출하여 사용 대상에게 토큰 개수만큼 제어할 수 있도록 승인합니다.
 * @param {address} spender - 사용 대상의 주소
 * @param {uint256} value - 토큰 개수
 */
const approve = async (signer, params) => {
  const tx = contract.methods.approve(
    web3.utils.toChecksumAddress(params[0]),
    Number(params[1])
  );

  sendTransaction(signer, tx);
};

/**
 * @dev ERC-1400 컨트랙트의 approveByPartition 함수를 호출하여 파티션별 사용 대상에게 토큰 개수만큼
 *      제어할 수 있도록 승인합니다.
 * @param {string} partition - 파티션
 * @param {address} spender - 사용 대상의 주소
 * @param {uint256} value - 토큰 개수
 */
const approveByPartition = async (signer, params) => {
  const tx = contract.methods.approveByPartition(
    web3.utils.toHex(params[0]).padEnd(66, "0"),
    web3.utils.toChecksumAddress(params[1]),
    Number(params[2])
  );

  sendTransaction(signer, tx);
};

/**
 * @dev ERC-1400 컨트랙트의 transfer 함수를 호출하여 받을 대상에게 토큰 개수만큼 토큰을 전송합니다.
 * @param {address} to - 받을 대상의 주소
 * @param {uint256} value - 토큰 개수
 */
const transfer = async (signer, params) => {
  // 토큰 잔액 조회
  const balance = await contract.methods.balanceOf(signer.address).call();

  if (balance) {
    if (Number(balance) < Number(params[1]) || Number(balance) <= 0) {
      console.log(
        "Error: Balance is not enough to send tokens or it is below zero"
      );

      return;
    }

    const tx = contract.methods.transfer(
      web3.utils.toChecksumAddress(params[0]),
      Number(params[1])
    );

    sendTransaction(signer, tx);
  }
};

/**
 * @dev ERC-1400 컨트랙트의 transferWithData 함수를 호출하여 받을 대상에게 토큰 개수만큼 토큰을
 *      전송합니다. (데이터 추가)
 * @param {address} to - 받을 대상의 주소
 * @param {uint256} value - 토큰 개수
 * @param {string} data - 데이터
 */
const transferWithData = async (signer, params) => {
  // 토큰 잔액 조회
  const balance = await contract.methods.balanceOf(signer.address).call();

  if (Number(balance) < Number(params[1]) || Number(balance) <= 0) {
    console.log(
      "Error: Balance is not enough to send tokens or it is below zero"
    );

    return;
  }

  let tx = contract.methods.transferWithData(
    web3.utils.toChecksumAddress(params[0]),
    Number(params[1]),
    web3.utils.utf8ToHex(params[2])
  );

  sendTransaction(signer, tx);
};

/**
 * @dev ERC-1400 컨트랙트의 transferFrom 함수를 호출하여 보내는 대상으로부터 받을 대상으로 토큰 개수만큼
 *      토큰을 전송합니다.
 * @param {address} from - 보내는 대상의 주소
 * @param {address} to - 받을 대상의 주소
 * @param {uint256} value - 토큰 개수
 */
const transferFrom = async (signer, params) => {
  const fromAddress = web3.utils.toChecksumAddress(params[0]);
  const toAddress = web3.utils.toChecksumAddress(params[1]);

  // 토큰 잔액 조회
  const balance = await contract.methods.balanceOf(fromAddress).call();

  if (Number(balance) < Number(params[2]) || Number(balance) <= 0) {
    console.log(
      "Error: Balance is not enough to send tokens or it is below zero"
    );

    return;
  }

  // 토큰 승인 개수 조회
  const allowance = await contract.methods
    .allowance(signer.address, fromAddress)
    .call();

  // operator 여부 조회
  const isOperator = await contract.methods
    .isOperator(signer.address, fromAddress)
    .call();

  if (
    isOperator ||
    (Number(allowance) >= Number(balance) && Number(allowance) !== 0)
  ) {
    let tx = contract.methods.transferFrom(
      fromAddress,
      toAddress,
      Number(params[2])
    );

    sendTransaction(signer, tx);
  } else
    console.log("Error: Allowance is not enough to send tokens or it is zero");
};

/**
 * @dev ERC-1400 컨트랙트의 transferFromWithData 함수를 호출하여 보내는 대상으로부터 받을 대상으로
 *      토큰 개수만큼 토큰을 전송합니다. (데이터 추가)
 * @param {address} from - 보내는 대상의 주소
 * @param {address} to - 받을 대상의 주소
 * @param {uint256} value - 토큰 개수
 * @param {string} data - 데이터
 */
const transferFromWithData = async (signer, params) => {
  const fromAddress = web3.utils.toChecksumAddress(params[0]);
  const toAddress = web3.utils.toChecksumAddress(params[1]);

  // 토큰 잔액 조회
  const balance = await contract.methods.balanceOf(fromAddress).call();

  if (Number(balance) < Number(params[2]) || Number(balance) <= 0) {
    console.log(
      "Error: Balance is not enough to send tokens or it is below zero"
    );

    return;
  }

  // 토큰 승인 개수 조회
  const allowance = await contract.methods
    .allowance(signer.address, fromAddress)
    .call();

  // operator 여부 조회
  const isOperator = await contract.methods
    .isOperator(signer.address, fromAddress)
    .call();

  if (
    isOperator ||
    (Number(allowance) >= Number(balance) && Number(allowance) !== 0)
  ) {
    let tx = contract.methods.transferFromWithData(
      fromAddress,
      toAddress,
      Number(params[2]),
      web3.utils.utf8ToHex(params[3])
    );

    sendTransaction(signer, tx);
  } else
    console.log("Error: Allowance is not enough to send tokens or it is zero");
};

/**
 * @dev ERC-1400 컨트랙트의 transferByPartition 함수를 호출하여 파티션별 받을 대상에게 토큰 개수만큼
 *      토큰을 전송합니다. (필요시 데이터 추가)
 * @param {string} partition - 파티션
 * @param {address} to - 받을 대상의 주소
 * @param {uint256} value - 토큰 개수
 * @param {string} data - (Optional) 데이터
 */
const transferByPartition = async (signer, params) => {
  // 토큰 잔액 조회
  const partition = web3.utils.toHex(params[0]).padEnd(66, "0");
  const balance = await contract.methods
    .balanceOfByPartition(partition, signer.address)
    .call();

  if (Number(balance) < Number(params[2]) || Number(balance) <= 0) {
    console.log(
      "Error: Balance is not enough to send tokens or it is below zero"
    );

    return;
  }

  let tempData = "";

  // 데이터를 추가한 경우 값 추가
  if (params[3]) tempData = params[3];

  let tx = contract.methods.transferByPartition(
    partition,
    web3.utils.toChecksumAddress(params[1]),
    Number(params[2]),
    web3.utils.utf8ToHex(tempData)
  );

  sendTransaction(signer, tx);
};

/**
 * @dev ERC-1400 컨트랙트의 operatorTransferByPartition 함수를 호출하여 파티션별 보내는 대상으로부터
 *      받을 대상으로 토큰 개수만큼 토큰 전송 (필요시 데이터 추가)
 * @param {string} partition - 파티션
 * @param {address} from - 보내는 대상 대상의 주소
 * @param {address} to - 받을 대상의 주소
 * @param {uint256} value - 토큰 개수
 * @param {string} data - (Optional) 데이터
 * @param {string} operatorData - (Optional) operator 데이터
 */
const operatorTransferByPartition = async (signer, params) => {
  // 토큰 잔액 조회
  const partition = web3.utils.toHex(params[0]).padEnd(66, "0");
  const fromAddress = web3.utils.toChecksumAddress(params[1]);
  const toAddress = web3.utils.toChecksumAddress(params[2]);
  const balance = await contract.methods
    .balanceOfByPartition(partition, fromAddress)
    .call();

  if (Number(balance) < Number(params[3]) || Number(balance) <= 0) {
    console.log(
      "Error: Balance is not enough to send tokens or it is below zero"
    );

    return;
  }

  // 토큰 승인 개수 조회
  const allowance = await contract.methods
    .allowanceByPartition(partition, signer.address, fromAddress)
    .call();

  // operator 여부 조회
  const isOperator = await contract.methods
    .isOperatorForPartition(partition, signer.address, fromAddress)
    .call();

  if (
    isOperator ||
    (Number(allowance) >= Number(balance) && Number(allowance) !== 0)
  ) {
    let tempData = "";
    let tempOperatorData = "";

    // 데이터를 추가한 경우 값 추가
    if (params[4]) tempData = params[4];
    if (params[5]) tempOperatorData = params[5];

    // 데이터를 둘 중에 하나만 입력한 경우 별도로 값 추가
    let dataType = dataTypeForOperatorTransferByPartition;

    if (dataTypeForOperatorTransferByPartition.type) {
      if (dataType.type === "data") tempData = params[4];
      else tempData = params[5];
    }

    let tx = contract.methods.operatorTransferByPartition(
      partition,
      fromAddress,
      toAddress,
      Number(params[3]),
      web3.utils.utf8ToHex(tempData),
      web3.utils.utf8ToHex(tempOperatorData)
    );

    sendTransaction(signer, tx);
  } else
    console.log("Error: Allowance is not enough to send tokens or it is zero");
};

/**
 * @dev ERC-1400 컨트랙트의 redeem 함수를 호출하여 토큰 개수만큼 토큰을 반환(상환)합니다. (필요시 데이터 추가)
 * @param {uint256} value - 토큰 개수
 * @param {string} data - (Optional) 데이터
 */
const redeem = async (signer, params) => {
  // 토큰 잔액 조회
  const balance = await contract.methods.balanceOf(signer.address).call();

  if (Number(balance) < Number(params[0]) || Number(balance) <= 0) {
    console.log(
      "Error: Balance is not enough to redeem tokens or it is below zero"
    );

    return;
  }

  let tempData = "";

  // 데이터를 추가한 경우 값 추가
  if (params[1]) tempData = params[1];

  let tx = contract.methods.redeem(
    Number(params[0]),
    web3.utils.utf8ToHex(tempData)
  );

  sendTransaction(signer, tx);
};

/**
 * @dev ERC-1400 컨트랙트의 redeemByPartition 함수를 호출하여 파티션별 토큰 개수만큼 토큰을
 *      반환(상환)합니다. (필요시 데이터 추가)
 * @param {string} partition - 파티션
 * @param {uint256} value - 토큰 개수
 * @param {string} data - (Optional) 데이터
 */
const redeemByPartition = async (signer, params) => {
  // 토큰 잔액 조회
  const partition = web3.utils.toHex(params[0]).padEnd(66, "0");
  const balance = await contract.methods
    .balanceOfByPartition(partition, signer.address)
    .call();

  if (Number(balance) < Number(params[1]) || Number(balance) <= 0) {
    console.log(
      "Error: Balance is not enough to redeem tokens or it is below zero"
    );

    return;
  }

  let tempData = "";

  // 데이터를 추가한 경우 값 추가
  if (params[2]) tempData = params[2];

  let tx = contract.methods.redeemByPartition(
    partition,
    Number(params[1]),
    web3.utils.utf8ToHex(tempData)
  );

  sendTransaction(signer, tx);
};

/**
 * @dev ERC-1400 컨트랙트의 redeemFrom 함수를 호출하여 회수 대상으로부터 토큰 개수만큼 토큰을
 *      반환(상환)합니다. (필요시 데이터 추가)
 * @param {address} from - 회수 대상의 주소
 * @param {uint256} value - 토큰 개수
 * @param {string} data - (Optional) 데이터
 */
const redeemFrom = async (signer, params) => {
  // 토큰 잔액 조회
  const fromAddress = web3.utils.toChecksumAddress(params[0]);
  const balance = await contract.methods.balanceOf(fromAddress).call();

  if (Number(balance) < Number(params[1]) || Number(balance) <= 0) {
    console.log(
      "Error: Balance is not enough to redeem tokens or it is below zero"
    );

    return;
  }

  // 토큰 승인 개수 조회
  const allowance = await contract.methods
    .allowance(signer.address, fromAddress)
    .call();

  // operator 여부 조회
  const isOperator = await contract.methods
    .isOperator(signer.address, fromAddress)
    .call();

  if (
    isOperator ||
    (Number(allowance) >= Number(balance) && Number(allowance) !== 0)
  ) {
    let tempData = "";

    // 데이터를 추가한 경우 값 추가
    if (params[2]) tempData = params[2];

    let tx = contract.methods.redeemFrom(
      fromAddress,
      Number(params[1]),
      web3.utils.utf8ToHex(tempData)
    );

    sendTransaction(signer, tx);
  } else
    console.log(
      "Error: Allowance is not enough to redeem tokens or it is zero"
    );
};

/**
 * @dev ERC-1400 컨트랙트의 operatorRedeemByPartition 함수를 호출하여 파티션별 회수 대상으로부터
 *      토큰 개수만큼 토큰을 반환(상환)합니다. (필요시 데이터 추가)
 * @param {string} partition - 파티션
 * @param {address} tokenHolder - 회수 대상의 주소
 * @param {uint256} value - 토큰 개수
 * @param {string} operatorData - (Optional) 데이터
 */
const operatorRedeemByPartition = async (signer, params) => {
  // 토큰 잔액 조회
  const partition = web3.utils.toHex(params[0]).padEnd(66, "0");
  const fromAddress = web3.utils.toChecksumAddress(params[1]);
  const balance = await contract.methods
    .balanceOfByPartition(partition, fromAddress)
    .call();

  if (Number(balance) < Number(params[2]) || Number(balance) <= 0) {
    console.log(
      "Error: Balance is not enough to redeem tokens or it is below zero"
    );

    return;
  }

  // 토큰 승인 개수 조회
  const allowance = await contract.methods
    .allowanceByPartition(partition, signer.address, fromAddress)
    .call();

  // operator 여부 조회
  const isOperator = await contract.methods
    .isOperatorForPartition(partition, signer.address, fromAddress)
    .call();

  if (
    isOperator ||
    (Number(allowance) >= Number(balance) && Number(allowance) !== 0)
  ) {
    let tempData = "";

    // 데이터를 추가한 경우 값 추가
    if (params[3]) tempData = params[3];

    let tx = contract.methods.operatorRedeemByPartition(
      partition,
      fromAddress,
      Number(params[2]),
      web3.utils.utf8ToHex(tempData)
    );

    sendTransaction(signer, tx);
  } else
    console.log(
      "Error: Allowance is not enough to redeem tokens or it is zero"
    );
};

const init = () => {
  functionCheck();
};

init();
