"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { currentUser } from "@/lib/data"
import { useToast } from "@/hooks/use-toast"
import { CardFooter } from "@/components/ui/card"

const formSchema = z.object({
  contactEmail: z.string().email({
    message: "Please enter a valid email address.",
  }),
})

export function SettingsForm() {
    const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contactEmail: currentUser.contactEmail || "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
    toast({
      title: "Settings saved!",
      description: `Your contact email has been updated to ${values.contactEmail}.`,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="contactEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Email</FormLabel>
              <FormControl>
                <Input placeholder="your.name@example.com" {...field} />
              </FormControl>
              <FormDescription>
                This is the email we will use for notifications and communication.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <CardFooter className="border-t px-6 py-4">
             <Button type="submit">Save</Button>
        </CardFooter>
      </form>
    </Form>
  )
}
