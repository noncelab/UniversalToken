const callFunctions = [
  "name",
  "symbol",
  "granularity",
  "totalSupply",
  "totalSupplyByPartition",
  "controllers",
  "controllersByPartition",
  "totalPartitions",
  "partitionsOf",
  "isMinter",
  "isOperator",
  "isOperatorForPartition",
  "balanceOf",
  "balanceOfByPartition",
  "allowance",
  "allowanceByPartition", 
  "isIssuable",
  "isControllable",
];

/**
 * @dev 인자 입력을 받지 않아도 되는 함수들 정의
 */
const callFunctionsForStepPass = [
  "name",
  "symbol",
  "granularity",
  "totalSupply",
  "controllers",
  "totalPartitions",
  "isIssuable",
  "isControllable",
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
