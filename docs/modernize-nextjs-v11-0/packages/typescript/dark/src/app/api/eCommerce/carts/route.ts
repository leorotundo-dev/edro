import { NextResponse } from "next/server";
import { ProductsData } from "@/app/components/apps/ecommerce/productData";
import { ProductType } from "@/app/(DashboardLayout)/types/apps/eCommerce";

type CartItem = ProductType & { qty: number };
let cartItems: CartItem[] = [];

export async function GET() {
  try {
    return NextResponse.json({ status: 200, msg: "success", data: cartItems });
  } catch (error) {
    return NextResponse.json({ status: 400, msg: "failed", error });
  }
}

export async function POST(req: Request) {
  try {
    const { productId } = await req.json();
    const productToAdd = ProductsData.find(
      (product) => product.id === productId
    );
    if (!productToAdd) {
      return NextResponse.json({ status: 400, msg: "Product not found" });
    }
    const isItemInCart = cartItems.find(
      (cartItem) => cartItem.id === productToAdd?.id
    );
    if (isItemInCart) {
      // if product available in the cart then update product to cartItems state
      let newItems = cartItems.map((cartItem) =>
        cartItem.id === productToAdd?.id
          ? { ...cartItem, qty: cartItem.qty + 1 }
          : cartItem
      );
      cartItems = newItems;
    } else {
      // Add the product to cartItems state
      cartItems.push({ ...productToAdd, qty: 1 });
    }

    return NextResponse.json({ status: 200, msg: "Success", data: cartItems });
  } catch (error) {
    return NextResponse.json({
      status: 400,
      msg: "Internal server error",
      data: error,
    });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, action } = await req.json();
    const productToAdd = ProductsData.find((product) => product.id === id);
    if (!productToAdd) {
      return NextResponse.json({ status: 400, msg: "Product not found" });
    }
    if (action === "Increment") {
      let newItems = cartItems.map((cartItem) =>
        cartItem.id === productToAdd?.id
          ? { ...cartItem, qty: cartItem.qty + 1 }
          : cartItem
      );
      cartItems = newItems;
    } else {
      let newItems = cartItems.map((cartItem) =>
        cartItem.id === productToAdd?.id
          ? {
              ...cartItem,
              qty: cartItem.qty > 0 ? cartItem.qty - 1 : cartItem.qty,
            }
          : cartItem
      );
      cartItems = newItems;
    }

    return NextResponse.json({ status: 200, msg: "Success", data: cartItems });
  } catch (error) {
    return NextResponse.json({
      status: 400,
      msg: "Internal server error",
      data: error,
    });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    let remainingItems = cartItems.filter((product) => {
      return product.id !== id;
    });
    cartItems = remainingItems;
    return NextResponse.json({ status: 200, msg: "Success", data: cartItems });
  } catch (error) {
    return NextResponse.json({
      status: 400,
      msg: "Internal server error",
      error,
    });
  }
}
