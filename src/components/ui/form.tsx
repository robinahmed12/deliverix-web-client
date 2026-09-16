"use client";

import * as React from "react";
import type { ControllerProps, FieldPath, FieldValues } from "react-hook-form";
import {
  Controller,
  FormProvider,
  useFormContext,
} from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
);

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue,
);

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `form-field-${idCounter}`;
}

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
}

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>) {
  const itemId = React.useMemo(() => nextId(), []);

  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <FormItemContext.Provider value={{ id: itemId }}>
        <Controller {...props} />
      </FormItemContext.Provider>
    </FormFieldContext.Provider>
  );
}

function FormItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField();

  return (
    <Label
      htmlFor={formItemId}
      className={cn(error && "text-destructive", className)}
      {...props}
    />
  );
}

function FormControl({ ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { formItemId, formDescriptionId, formMessageId } = useFormField();

  return (
    <div
      id={formItemId}
      aria-describedby={
        !formDescriptionId && !formMessageId
          ? undefined
          : `${formDescriptionId} ${formMessageId}`.trim()
      }
      {...props}
    />
  );
}

function FormDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      id={formDescriptionId}
      className={cn("text-[0.8rem] text-muted-foreground", className)}
      {...props}
    />
  );
}

function FormMessage({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? "") : children;

  if (!body) {
    return null;
  }

  return (
    <p
      id={formMessageId}
      className={cn("text-[0.8rem] font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  );
}

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
};