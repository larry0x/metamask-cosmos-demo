import { Registry, TxBodyEncodeObject } from "@cosmjs/proto-signing";
import { StargateClient, defaultRegistryTypes } from "@cosmjs/stargate";
import { MsgSendEncodeObject } from "@cosmjs/stargate/build/modules/bank/messages"
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { AuthInfo, SignDoc, SignerInfo } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { bech32 } from "bech32";

const fromAddrInput = document.getElementById("fromAddr") as HTMLInputElement;
const toAddrInput = document.getElementById("toAddr") as HTMLInputElement;
const denomInput = document.getElementById("denom") as HTMLInputElement;
const amountInput = document.getElementById("amount") as HTMLInputElement;
const chainIdInput = document.getElementById("chainId") as HTMLInputElement;
const sequenceInput = document.getElementById("sequence") as HTMLInputElement;
const accountNumberInput = document.getElementById("accountNumber") as HTMLInputElement;
const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;

const rpcEndpoint = "http://127.0.0.1:26657";

function encodeHex(bytes: Uint8Array) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("")
}

function addressBytesFromBech32(str: string) {
  const { words } = bech32.decode(str)
  return bech32.fromWords(words)
}

submitBtn.addEventListener("click", async function () {
  // interface registry - used to encode protobuf types
  const registry = new Registry(defaultRegistryTypes);

  // stargate client - used to broadcast transaction
  // const client = await StargateClient.connect(rpcEndpoint);

  const fromAddress = fromAddrInput.value;
  const fromAddrBytes = addressBytesFromBech32(fromAddress);

  const publicKey = {
    typeUrl: "/larry.abstractaccount.v1.NilPubKey",
    // a bit of hacking to encode the pk into proto bytes
    value: new Uint8Array([10, 32, ...fromAddrBytes]),
  };

  const msg: MsgSendEncodeObject = {
    typeUrl: "/cosmos.bank.v1beta1.MsgSend",
    value: {
      fromAddress,
      toAddress: toAddrInput.value,
      amount: [
        Coin.fromPartial({
          denom: denomInput.value,
          amount: amountInput.value,
        }),
      ],
    }
  };

  const body: TxBodyEncodeObject = {
    typeUrl: "/cosmos.tx.v1beta1.TxBody",
    value: {
      messages: [msg],
    },
  };

  const authInfo = AuthInfo.fromPartial({
    signerInfos: [
      SignerInfo.fromPartial({
        publicKey,
        modeInfo: {
          single: {
            mode: SignMode.SIGN_MODE_DIRECT,
          },
        },
        sequence: sequenceInput.value,
      }),
    ],
    fee: {
      amount: [],
      gasLimit: 200000,
      payer: "",
      granter: "",
    },
  });

  const signDoc = SignDoc.fromPartial({
    bodyBytes: registry.encode(body),
    authInfoBytes: AuthInfo.encode(authInfo).finish(),
    chainId: chainIdInput.value,
    accountNumber: accountNumberInput.value,
  });

  const signBytes = SignDoc.encode(signDoc).finish();
});
