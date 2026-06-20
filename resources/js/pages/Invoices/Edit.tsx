import InvoicesCreate from './Create';

interface Props {
    invoice: any;
    customers: any[];
    products: any[];
    sizes: any[];
    paymentMethods: any[];
    flash?: { success?: string; error?: string };
}

export default function InvoicesEdit({ invoice, customers, products, sizes, paymentMethods, flash }: Props) {
    return (
        <InvoicesCreate
            customers={customers}
            products={products}
            sizes={sizes}
            paymentMethods={paymentMethods}
            flash={flash}
            editInvoice={invoice}
        />
    );
}
