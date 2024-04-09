const callFunctions = [
  "name",
  "symbol",
  "granularity",
  "isControllable",
  "isIssuable",
  "balanceOf",
  "allowance",
  "totalPartitions",
  "totalSupply",
  "totalSupplyByPartition",
  "partitionsOf",
  "balanceOfByPartition",
  "allowanceByPartition",
  "isOperator",
  "isOperatorForPartition",
  "controllers",
  "controllersByPartition",
  "isMinter",
];

/**
 * @dev 인자 입력을 받지 않아도 되는 함수들 정의
 */
const callFunctionsForStepPass = [
  "name",
  "symbol",
  "granularity",
  "isControllable",
  "isIssuable",
  "totalPartitions",
  "controllers",
  "totalSupply",
];

const sendFunctions = [
  "authorizeOperator",
  "revokeOperator",
  "authorizeOperatorByPartition",
  "revokeOperatorByPartition",
  "approve",
  "approveByPartition",
  "transfer",
  "transferWithData",
  "transferFrom",
  "transferFromWithData",
  "transferByPartition",
  "operatorTransferByPartition",
  "redeem",
  "redeemFrom",
  "redeemByPartition",
  "operatorRedeemByPartition",
];

module.exports = { callFunctions, sendFunctions, callFunctionsForStepPass };
