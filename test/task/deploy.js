const Web3 = require("web3");
const ABI = require("../../build/contracts/ERC1400.json").abi;
const BYTECODE = require("../../build/contracts/ERC1400.json").bytecode;
require("dotenv").config({ path: "../../.env" });

// 에러 출력
const errorConsole = () => {
  console.log(
    "#################################################################################################################"
  );
  console.log(
    "#                                        올바르지 않은 인자가 있습니다.                                         #"
  );
  console.log(
    "#################################################################################################################"
  );
  console.log(
    "[사용법] node deploy.js name symbol granularity controllerCnt partitionsCnt [controllers] [partitions]\n"
  );
  console.log(
    "* name: 토큰명\n* symbol: 토큰 심볼\n* granularity: 분할 단위 (1 이상)\n* controllersCnt: controller를 몇 명 정의할 것인지에 대한 값\n* partitionsCnt: 파티션을 몇 개 정의할 것인지에 대한 값\n* [controllers]: controller의 주소를 띄어쓰기로 구분하여 나열 (대괄호 표시는 하지 않으며, 없는 경우 -로 표시\n* [partitions]: 파티션에 정의할 내용을 띄어쓰기로 구분하여 나열 (대괄호 표시는 하지 않으며, 없는 경우 -로 표시)\n"
  );
  console.log(
    "** 예시 1 (1명의 컨트롤러와 3개의 파티션)\n: node deploy.js ERC1400Token DAU 1 1 3 0xb5747835141b46f7C472393B31F8F5A57F74A44f reserved issued locked\n"
  );
  console.log(
    "** 예시 2 (2명의 컨트롤러와 파티션 없음)\n: node deploy.js ERC1400Token DAU 1 2 0 0xb5747835141b46f7C472393B31F8F5A57F74A44f 0xaBEA9132b05A70803a4E85094fD0e1800777fBEF -"
  );
  console.log(
    "*******************************************************************************************************"
  );
};

const web3 = new Web3(
  new Web3.providers.HttpProvider("https://rpc.ssafy-blockchain.com")
);

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
      process.argv[4] < 1 ||
      isNaN(process.argv[5]) ||
      isNaN(process.argv[6])
    ) {
      errorConsole();
      return;
    }

    let tokenGranularity = Number(process.argv[4]);
    let tokenControllersCnt = Number(process.argv[5]);
    let tokenPartitionsCnt = Number(process.argv[6]);

    let tokenControllers = [];
    let tokenPartitions = [];

    // tokenControllersCnt 수만큼 돌며 컨트롤러 배열 대입
    for (let i = 7; i < tokenControllersCnt + 7; i++) {
      if (process.argv[i] !== "-")
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

    deploy(
      tokenName,
      tokenSymbol,
      tokenGranularity,
      tokenControllers,
      tokenPartitions
    );
  } else errorConsole();
};

console.log(process.env.PRIVATE_KEY);

// 컨트랙트 코드 배포
const deploy = async (name, symbol, granularity, controllers, partitions) => {
  const signer = web3.eth.accounts.privateKeyToAccount(
    "0x" + process.env.PRIVATE_KEY
  );

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
      gas: 5000000,
    })
    .once("transactionHash", (txHash) => {
      console.log(txHash);
    });

  console.log(deployedContract);
};

argumentCheck();
