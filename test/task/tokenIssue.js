/**
 * 토큰 발행 관리를 위한 스크립트 파일
 * @brief issue, issueByPartition 함수 호출로 컨트랙트 상호 작용 가능
 * @command node ./test/task/tokenIssue.js contractAddr requestorAddr targetTokenHolder value data manageFunction [함수별 파라미터]
 * @see 관련 문서: https://www.notion.so/noncelab/SC-issue-c1d874a3ffb141f39c6fb27ce71dfa68?pvs=4#4a8029c984904fe18925f407e63f1058
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
    `유효하지 않은 인자 [${number}] (https://www.notion.so/noncelab/SC-issue-c1d874a3ffb141f39c6fb27ce71dfa68?pvs=4#4a8029c984904fe18925f407e63f1058 참고)`
  );
};

// 인자 및 isMinter 사전 검증
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
          console.log("Error: value는 granularity의 배수여야 합니다");
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
          // defaultPartition이 있는지 여부 확인
          const defaultPartition = await contract.methods
            .getDefaultPartitions()
            .call();

          if (JSON.stringify(defaultPartition) === "[]") {
            console.log(
              "Error: 토큰 발행을 위해 defaultPartition을 설정해주세요"
            );
            return;
          }

          // 단순 토큰 발행일 때 데이터가 있는 경우
          if (process.argv[7]) params.data = process.argv[7];
        } else if (manageFunction === "issueByPartition") {
          // 파티션별 토큰 발행인 경우
          data.partition = process.argv[7];

          // 데이터가 있는 경우
          if (process.argv[8]) params.data = process.argv[8];
        }

        if (["issue", "issueByPartition"].includes(manageFunction)) {
          issueToken(contractAddr, manageFunction, params);
        } else handleError(1);
      } else {
        console.log("Error: requestorAddr는 minter가 아닙니다");
        return;
      }
    } else handleError(2);
  } else handleError(3);
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
      params.partition,
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
    .once("receipt", (result) => {
      console.log("Result:", result);
    });
};

argumentCheck();
