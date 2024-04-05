/**
 * 토큰 전송 관리를 위한 스크립트 파일
 * @brief transfer, transferWithData, transferFrom, transferFromWithData, transferByPartition, operatorTransferByPartition 함수 호출로 컨트랙트 상호 작용 가능
 * @command node ./test/task/transfer.js contractAddr requestorAddr targetTokenHolder value data manageFunction [함수별 파라미터]
 * @see 관련 문서: https://www.notion.so/noncelab/SC-transfer-64b45857e8984d3b9e48085236784171?pvs=4#8f68534fa0864ee4b5a654d363fc4334
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
    `Invalid Arguments [${number}] (Refer to https://www.notion.so/noncelab/SC-transfer-64b45857e8984d3b9e48085236784171?pvs=4#8f68534fa0864ee4b5a654d363fc4334)`
  );
};

// 인자 및 approved 사전 검증
const argumentCheck = async () => {
  // 필요한 인자가 모두 입력되었는지 확인
  if (
    process.argv.length > 6 &&
    process.argv.slice(2).every((arg) => arg && arg.length > 0)
  ) {
    // CA 및 EOA 주소가 올바른지 / value가 숫자인지 확인
    if (
      web3.utils.isAddress(process.argv[2]) &&
      web3.utils.isAddress(process.argv[3]) &&
      web3.utils.isAddress(process.argv[4]) &&
      !isNaN(process.argv[5])
    ) {
      let contractAddr = web3.utils.toChecksumAddress(process.argv[2]);
      let requestorAddr = web3.utils.toChecksumAddress(process.argv[3]);

      // requestorAddr가 isMinter인지 확인
      // 관리자(서명자) 정보 추가
      web3.eth.accounts.wallet.add(signer);

      const contract = new web3.eth.Contract(ABI, process.argv[2]);
      const result = await contract.methods.isMinter(process.argv[3]).call();

      if (result) {
        let targetTokenHolder = web3.utils.toChecksumAddress(process.argv[4]);
        let value = Number(process.argv[5]);

        // value가 granularity의 배수인지 확인
        const granularity = await contract.methods.granularity().call();

        if (Number(value) % Number(granularity) !== 0) {
          console.log("Error: value must be multiple number of granularity");
          return;
        }

        let manageFunction = process.argv[6];

        let params = {
          requestorAddr: requestorAddr,
          targetTokenHolder: targetTokenHolder,
          value: value,
          data: "",
        };

        // 전송 데이터가 포함되는 경우 data에 추가
        if (manageFunction === "issue") {
          // 단순 토큰 발행일 때 데이터가 있는 경우
          if (process.argv[7]) params.data = process.argv[7];
        } else if (manageFunction === "issueByPartition") {
          // 파티션별 토큰 발행인 경우
          if (process.argv[7]) {
            let partition = process.argv[7];

            params.partition = partition;

            // 데이터가 있는 경우
            if (process.argv[8]) params.data = process.argv[8];
          } else {
            handleError(1);
            return;
          }
        }

        if (["issue", "issueByPartition"].includes(manageFunction)) {
          return {
            contractAddr,
            manageFunction,
            params,
          };
        } else handleError(2);
      } else {
        console.log(`Error: requestorAddr ${requestorAddr} is not a minter`);
        return;
      }
    } else handleError(3);
  } else handleError(4);
};

// 토큰 발행
const issueToken = async (ca, code, params) => {
  // 관리자(서명자) 정보 추가
  web3.eth.accounts.wallet.add(signer);

  const contract = new web3.eth.Contract(ABI, ca);

  // 컨트랙트 전달 값 설정
  let deployTx = "";

  if (code === "issue") {
    // 단순 토큰 발행
    deployTx = contract.methods.issue(
      params.targetTokenHolder,
      params.value,
      web3.utils.utf8ToHex(params.data)
    );
  } else {
    // 파티션별 토큰 발행
    deployTx = contract.methods.issueByPartition(
      web3.utils.toHex(params.partition).padEnd(66, "0"),
      params.targetTokenHolder,
      params.value,
      web3.utils.utf8ToHex(params.data)
    );
  }

  // 트랜잭션 전송
  await deployTx
    .send({
      from: signer.address,
      gas: await deployTx.estimateGas({ from: signer.address }),
    })
    .once("transactionHash", (txHash) => {
      console.log("TxHash:", txHash);
    })
    .once("receipt", async (result) => {
      console.log("Result:", result);

      // 토큰 발행 후 잔액 및 총량 확인
      await checkBalance(
        ca,
        code,
        params.targetTokenHolder,
        params.partition ? params.partition : undefined
      );
    });
};

// 토큰 잔액 및 총량 확인
const checkBalance = async (ca, manageFunction, tokenHolder, partition) => {
  web3.eth.accounts.wallet.add(signer);

  // 토큰 총량 조회
  const contract = new web3.eth.Contract(ABI, ca);
  let totalSupply = 0;
  let balanceOfTokenHolder = 0;

  if (manageFunction === "issue") {
    // 단순 토큰 발행
    const supplyResult = await contract.methods.totalSupply().call();

    if (supplyResult) totalSupply = supplyResult;

    const balanceResult = await contract.methods
      .balanceOf(web3.utils.toChecksumAddress(tokenHolder))
      .call();

    if (balanceResult) balanceOfTokenHolder = balanceResult;

    console.log("Total supply:", supplyResult);
    console.log(`Balance of ${tokenHolder}:`, balanceResult);
  } else if (manageFunction === "issueByPartition") {
    // 파티션별 토큰 발행
    const supplyResult = await contract.methods
      .totalSupplyByPartition(web3.utils.toHex(partition).padEnd(66, "0"))
      .call();

    if (supplyResult) totalSupply = supplyResult;

    const balanceResult = await contract.methods
      .balanceOfByPartition(
        web3.utils.toHex(partition).padEnd(66, "0"),
        web3.utils.toChecksumAddress(tokenHolder)
      )
      .call();

    if (balanceResult) balanceOfTokenHolder = balanceResult;

    console.log(
      `Total supply by ${partition} (${web3.utils
        .toHex(partition)
        .padEnd(66, "0")}):`,
      supplyResult
    );
    console.log(
      `Balance of by ${partition} (${web3.utils
        .toHex(partition)
        .padEnd(66, "0")}):`,
      balanceResult
    );
  }
};

const test = async () => {
  const parameterObject = await argumentCheck();

  if (parameterObject) {
    console.log(`Trying to call/send ${parameterObject.manageFunction}...`);

    await issueToken(
      parameterObject.contractAddr,
      parameterObject.manageFunction,
      parameterObject.params
    );
  }
};

test();
