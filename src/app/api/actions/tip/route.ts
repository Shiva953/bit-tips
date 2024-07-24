import {
    ActionPostResponse,
    ACTIONS_CORS_HEADERS,
    createPostResponse,
    ActionGetResponse,
    ActionPostRequest,
  } from "@solana/actions";
  import {
    Authorized,
    clusterApiUrl,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    StakeProgram,
    SystemProgram,
    Transaction,
  } from "@solana/web3.js";

  const DEFAULT_SOL_ADDRESS: PublicKey = new PublicKey(
    "5SVgMJHrMLYGfPw9nYpPuH6DDWpbNAbs5Dm7kyyREhRR",
  );
  
  const DEFAULT_SOL_AMOUNT: number = 1.0;
  
  //GET req -> returns the action metadeta as response(which would be unfurled into a blink by supported client)
  export const GET = async (req: Request) => {
    try {
      const requestUrl = new URL(req.url);
      const { toPubkey } = validatedQueryParams(requestUrl);
  
      const baseHref = new URL(
        `/api/actions/tip?to=${toPubkey.toBase58()}`,
        requestUrl.origin,
      ).toString();
  
      const payload: ActionGetResponse = {
        title: "Bit-Tips",
        icon: new URL("https://cdn.prod.website-files.com/6531cf988b06260fbdbb0235/65497a45e8180f1d955675a5_653eb80086c2be667c2793e1_653eb14f23b4c738f6353388_3356.png", requestUrl.origin).toString(),
        description: "Tip your favourite devs, writers and artists!",
        label: "Transfer", // this value will be ignored since `links.actions` exists
        links: {
          actions: [
            {
              label: "Send 0.1 SOL",
              href: `${baseHref}&amount=${"0.1"}`,
            },
            {
              label: "Send 0.5 SOL",
              href: `${baseHref}&amount=${"0.5"}`,
            },
            {
              label: "Send 1 SOL",
              href: `${baseHref}&amount=${"1"}`,
            },
            {
              label: "Send SOL",
              href: `/api/actions/tip?to={recipient}&amount={amount}`, // this href will have a text input
              parameters: [
                {
                  name: "amount", 
                  label: "Amount(in SOL)",
                  required: true,
                },
                {
                    name: "recipient", 
                    label: "Wallet Address to be tipped", 
                    required: true,
                },
              ],
            },
          ],
        },
      };
  
      return Response.json(payload, {
        headers: ACTIONS_CORS_HEADERS,
      });
    } catch (err) {
      console.log(err);
      let message = "An unknown error occurred";
      if (typeof err == "string") message = err;
      return new Response(message, {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }
  };
  
  //take the input amount + pubkey, make a POST req with those params to the actions server
  // actions server returns a base64 encoded TXN, which shall be signed by the user on the client side with his wallet
  export const POST = async (req: Request) => {
    try {
      const requestUrl = new URL(req.url);
      const { amount, toPubkey } = validatedQueryParams(requestUrl); //decoding query params
  
      const body: ActionPostRequest = await req.json(); //the POST request body
  
      // validate the client provided input
      let account: PublicKey;
      try {
        account = new PublicKey(body.account);
      } catch (err) {
        return new Response('Invalid "account" provided', {
          status: 400,
          headers: ACTIONS_CORS_HEADERS,
        });
      }
  
      const connection = new Connection(
        process.env.SOLANA_RPC! || clusterApiUrl("mainnet-beta"), "confirmed"
      );
  
      
      const minimumBalance = await connection.getMinimumBalanceForRentExemption(
        0, 
      );
      if (amount * LAMPORTS_PER_SOL < minimumBalance) {
        throw `account may not be rent exempt: ${toPubkey.toBase58()}`;
      }
  
      const transaction = new Transaction();
  
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: account,
          toPubkey: toPubkey,
          lamports: amount * LAMPORTS_PER_SOL,
        }),
      );
  
      // set the end user as the fee payer
      transaction.feePayer = account;
  
      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;

  
      // response for the POST req is in this format
      // it signs the txn, base64 encodes it, POST response form => {base64 encoded txn, message}
      const payload: ActionPostResponse = await createPostResponse({
        fields: {
          transaction,
          message: `Send ${amount} SOL to ${toPubkey.toBase58()}`,
        },
        // note: no additional signers are needed
        // signers: [],
      }); 
  
      return Response.json(payload, {
        headers: ACTIONS_CORS_HEADERS,
      });
    } catch (err) {
        console.log(err);
        let message = "An unknown error occurred";
        if (typeof err == "string") message = err;
        return new Response(message, {
            status: 400,
            headers: ACTIONS_CORS_HEADERS,
        });
    }
  };

  // DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
  // THIS WILL ENSURE CORS WORKS FOR BLINKS
  export const OPTIONS = async (req: Request) => {
    return new Response(null, {
      status: 204,
      headers: ACTIONS_CORS_HEADERS,
    });
  };

  // req url -> {amount, pubkey}
  function validatedQueryParams(requestUrl: URL) {
    let toPubkey: PublicKey = DEFAULT_SOL_ADDRESS;
    let amount: number = DEFAULT_SOL_AMOUNT;
  
    try {
      if (requestUrl.searchParams.get("to")) {
        toPubkey = new PublicKey(requestUrl.searchParams.get("to")!);
      }
    } catch (err) {
      throw "Invalid input query parameter: to";
    }
  
    try {
      if (requestUrl.searchParams.get("amount")) {
        amount = parseFloat(requestUrl.searchParams.get("amount")!);
      }
  
      if (amount <= 0) throw "amount is too small";
    } catch (err) {
      throw "Invalid input query parameter: amount";
    }
  
    return {
      amount,
      toPubkey,
    };
  }