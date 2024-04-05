/**
 * 컨트랙트 배포를 위한 스크립트 파일
 * @brief 스크립트 호출로 컨트랙트 배포 가능
 * @command node ./test/task/deploy.js requestorAddr name symbol granularity controllerCnt partitionsCnt [controllers] [partitions]
 * @see 관련 문서: https://www.notion.so/noncelab/SC-deploy-a69c656cf24240fe84a42172e18afab4?pvs=4#ce95418216684d33bbae58a39d155cab
 */

const Web3 = require("web3");
const ABI = require("../../build/contracts/ERC1400.json").abi;
const BYTECODE = require("../../build/contracts/ERC1400.json").bytecode;
require("dotenv").config();

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_URL));
const signer = web3.eth.accounts.privateKeyToAccount(
  "0x" + process.env.PRIVATE_KEY
);

const handleError = (number) => {
  console.log(
    `유효하지 않은 인자 [${number}] (https://www.notion.so/noncelab/SC-deploy-a69c656cf24240fe84a42172e18afab4?pvs=4#ce95418216684d33bbae58a39d155cab 참고)`
  );
};

// 디폴트 파티션
const partition1_short =
  "7265736572766564000000000000000000000000000000000000000000000000"; // reserved in hex
const partition2_short =
  "6973737565640000000000000000000000000000000000000000000000000000"; // issued in hex
const partition3_short =
  "6c6f636b65640000000000000000000000000000000000000000000000000000"; // locked in hex
const partition1 = "0x".concat(partition1_short);
const partition2 = "0x".concat(partition2_short);
const partition3 = "0x".concat(partition3_short);

const defaultPartitions = [partition1, partition2, partition3];

// 인자 사전 검증
const argumentCheck = () => {
  // 필요한 인자가 모두 입력되었는지 확인
  if (
    process.argv.length > 9 &&
    process.argv.slice(2).every((arg) => arg && arg.length > 0)
  ) {
    let tokenName = process.argv[2];
    let tokenSymbol = process.argv[3];

    // 숫자 인자가 필요한 항목이 숫자가 아닌 경우 확인
    if (
      isNaN(process.argv[5]) ||
      Number(process.argv[5]) < 1 ||
      isNaN(process.argv[6]) ||
      isNaN(process.argv[7])
    ) {
      handleError(1);
      return;
    }

    let tokenGranularity = Number(process.argv[5]);
    let tokenControllersCnt = Number(process.argv[6]);
    let tokenPartitionsCnt = Number(process.argv[7]);

    let tokenControllers = [];
    let tokenPartitions = [];

    // tokenControllersCnt 수만큼 돌며 controller 배열 대입
    for (let i = 8; i < tokenControllersCnt + 8; i++) {
      if (process.argv[i] !== "-" && web3.utils.isAddress(process.argv[i]))
        tokenControllers.push(web3.utils.toChecksumAddress(process.argv[i]));
    }

    // tokenPartitionCnt 수만큼 돌며 파티션 배열 대입
    for (
      let i = 8 + tokenControllersCnt;
      i < tokenControllersCnt + tokenPartitionsCnt + 8;
      i++
    ) {
      if (process.argv[i] !== "-")
        tokenPartitions.push(web3.utils.toHex(process.argv[i]).padEnd(66, "0"));
    }

    // 파티션이 지정되지 않은 경우 기본 파티션 지정: reserved issued locked
    if (tokenPartitions.length === 0)
      tokenPartitions = defaultPartitions.map((item) => item);

    // 초기 tokenController에 시스템 owner와 requestorAddr가 포함되어 있지 않은 경우 강제로 추가
    if (!tokenControllers.includes(process.argv[2]))
      tokenControllers.push(web3.utils.toChecksumAddress(process.argv[2]));

    if (!tokenControllers.includes(signer.address))
      tokenControllers.push(web3.utils.toChecksumAddress(signer.address));

    return {
      tokenName,
      tokenSymbol,
      tokenGranularity,
      tokenControllers,
      tokenPartitions,
    };
  } else handleError(2);
};

// 컨트랙트 코드 배포
const deploy = async (name, symbol, granularity, controllers, partitions) => {
  let transactionHash;
  // 컨트랙트 배포 관리자(서명자) 정보 추가
  web3.eth.accounts.wallet.add(signer);

  const contract = new web3.eth.Contract(ABI);

  // 컨트랙트 생성자 전달 값 설정
  const deployTx = contract.deploy({
    data: BYTECODE,
    arguments: [name, symbol, granularity, controllers, partitions],
  });

  // 컨트랙트 배포
  const deployedContract = await deployTx
    .send({
      from: signer.address,
      gas: await deployTx.estimateGas({ from: signer.address }),
    })
    .once("transactionHash", (txHash) => {
      console.log("TxHash:", txHash);
      transactionHash = txHash;
    });

  return {
    CA: deployedContract.options.address,
    TxHash: transactionHash,
    SystemOwner: signer.address,
    Requestor: process.argv[2],
  };
};

const addMinter = async (ca, newMinter) => {
  // minter 권한 추가
  web3.eth.accounts.wallet.add(signer);

  // 관리자(서명자) 정보 추가
  const contract = new web3.eth.Contract(ABI, ca);
  const addMinterTx = contract.methods.addMinter(newMinter);

  await addMinterTx
    .send({
      from: signer.address,
      gas: await addMinterTx.estimateGas({ from: signer.address }),
    })
    .once("transactionHash", (txHash) => {
      console.log("TxHash:", txHash);
    })
    .once("receipt", (result) => {
      console.log("Result:", result);
    });
};

const test = async () => {
  console.log("1. Check arguments...");
  const parameterObject = argumentCheck();

  if (parameterObject) {
    console.log("2. Start deploying...");
    const result = await deploy(
      parameterObject.tokenName,
      parameterObject.tokenSymbol,
      parameterObject.tokenGranularity,
      parameterObject.tokenControllers,
      parameterObject.tokenPartitions
    );

    if (result) {
      console.log("Finish deployment\n", result);

      // constructor에서 minter로 추가하고 있기 때문에 추가로 minter로 추가할 필요 없음
      // addMinter는 minter로 지정된 사용자가 또 다른 minter를 추가하고 싶을 때 사용함

      // console.log("3. Add requestor as minter...");
      // await addMinter(result.CA, result.Requestor);
    }
  }
};

test();
