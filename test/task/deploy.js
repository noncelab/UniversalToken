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

// 인자 사전 검증
const argumentCheck = () => {
  // 필요한 인자가 모두 입력되었는지 확인
  if (
    process.argv.length > 8 &&
    process.argv.slice(2).every((arg) => arg && arg.length > 0)
  ) {
    let tokenName = process.argv[2];
    let tokenSymbol = process.argv[3];

    // 숫자 인자가 필요한 항목이 숫자가 아닌 경우 확인
    if (
      isNaN(process.argv[4]) ||
      Number(process.argv[4]) < 1 ||
      isNaN(process.argv[5]) ||
      isNaN(process.argv[6])
    ) {
      handleError(1);
      return;
    }

    let tokenGranularity = Number(process.argv[4]);
    let tokenControllersCnt = Number(process.argv[5]);
    let tokenPartitionsCnt = Number(process.argv[6]);

    let tokenControllers = [];
    let tokenPartitions = [];

    // tokenControllersCnt 수만큼 돌며 컨트롤러 배열 대입
    for (let i = 7; i < tokenControllersCnt + 7; i++) {
      if (process.argv[i] !== "-" && web3.utils.isAddress(process.argv[i]))
        tokenControllers.push(web3.utils.toChecksumAddress(process.argv[i]));
    }

    // tokenPartitionCnt 수만큼 돌며 파티션 배열 대입
    for (
      let i = 7 + tokenControllersCnt;
      i < tokenControllersCnt + tokenPartitionsCnt + 7;
      i++
    ) {
      if (process.argv[i] !== "-")
        tokenPartitions.push(web3.utils.toHex(process.argv[i]).padEnd(66, "0"));
    }

    // 초기 tokenController에 시스템 owner와 requestorAddr가 포함되어 있지 않은 경우 강제로 추가
    if (!tokenControllers.includes(process.argv[2]))
      tokenControllers.push(web3.utils.toChecksumAddress(process.argv[2]));

    if (!tokenControllers.includes(signer.address))
      tokenControllers.push(web3.utils.toChecksumAddress(signer.address));

    deploy(
      tokenName,
      tokenSymbol,
      tokenGranularity,
      tokenControllers,
      tokenPartitions
    );
  } else handleError(2);
};

// 컨트랙트 코드 배포
const deploy = async (name, symbol, granularity, controllers, partitions) => {
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
    });

  console.log("CA:", deployedContract.options.address);
};

argumentCheck();
