import {
  DiscountClass,
  ProductDiscountSelectionStrategy,
} from '../generated/api';

export function cartLinesDiscountsGenerateRun(input) {
  // 1. Only run if this discount gives product discounts
  if (!input.discount.discountClasses.includes(DiscountClass.Product)) {
    return { operations: [] };
  }

  // 2. Read settings from the discount's metafield (default: 15%)
  const config = input.discount.metafield?.jsonValue ?? {};
  const percentage =
    Number(config.percentage) > 0 && Number(config.percentage) <= 100
      ? Number(config.percentage)
      : 15;

  // 3. Keep only cart lines whose product has the "promo" tag
  const promoLines = input.cart.lines.filter(
    (line) =>
      line.merchandise.__typename === 'ProductVariant' &&
      line.merchandise.product.hasAnyTag
  );

  // 4. Count promo items (2 of the same board also counts as 2)
  const promoItemCount = promoLines.reduce(
    (total, line) => total + line.quantity,
    0
  );
  if (promoItemCount < 2) {
    return { operations: [] };
  }

  // 5. Find the cheaper line
  const cheapestLine = promoLines.reduce((cheapest, line) =>
    Number(line.cost.amountPerQuantity.amount) <
    Number(cheapest.cost.amountPerQuantity.amount)
      ? line
      : cheapest
  );

  // 6. Discount ONE unit of the cheaper item
  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [
            {
              message: `Buy 2 promo items: ${percentage}% off the cheaper one`,
              targets: [{ cartLine: { id: cheapestLine.id, quantity: 1 } }],
              value: { percentage: { value: percentage } },
            },
          ],
          selectionStrategy: ProductDiscountSelectionStrategy.First,
        },
      },
    ],
  };
}